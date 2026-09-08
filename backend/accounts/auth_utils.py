import re
import random
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import PatientProfile, OTPVerification, BlockedIdentifier, SecurityAuditLog

User = get_user_model()

def clean_digits(val: str) -> str:
    """Removes all non-digit characters."""
    return re.sub(r'\D', '', val or '')

def detect_identifier_type(identifier: str) -> str:
    """
    Detects whether the identifier is:
    - 'aadhaar': 12 digits
    - 'abha': 14 digits or contains '@abdm' / '@sbx'
    - 'mobile': 10 digits (or 10 digits with +91/91 prefix)
    - 'email': contains '@' and not ending with abdm/sbx
    - 'username': fallback alphanumeric
    """
    if not identifier:
        return 'unknown'
    
    val = identifier.strip()
    digits_only = clean_digits(val)

    # Check Email
    if '@' in val:
        if val.lower().endswith(('@abdm', '@sbx', '@abdm.gov.in')):
            return 'abha'
        if '.' in val.split('@')[-1]:
            return 'email'
        return 'abha'

    # Check 12-digit Aadhaar
    if len(digits_only) == 12:
        return 'aadhaar'

    # Check 14-digit ABHA
    if len(digits_only) == 14:
        return 'abha'

    # Check 10-digit Mobile (with or without 91 or 0 prefix)
    if len(digits_only) == 10:
        return 'mobile'
    if len(digits_only) > 10 and digits_only.startswith(('91', '0')) and len(digits_only[-10:]) == 10:
        return 'mobile'

    # Check if ABHA format with hyphens (e.g. 14-8921-3490-1284)
    if val.startswith('14-') or len(digits_only) == 14:
        return 'abha'

    return 'username'

def format_aadhaar(digits: str) -> str:
    """Formats 12-digit Aadhaar as 'XXXX XXXX XXXX'"""
    d = clean_digits(digits)
    if len(d) == 12:
        return f"{d[0:4]} {d[4:8]} {d[8:12]}"
    return digits

def format_abha(digits: str) -> str:
    """Formats 14-digit ABHA as '14-XXXX-XXXX-XXXX'"""
    d = clean_digits(digits)
    if len(d) == 14:
        return f"{d[0:2]}-{d[2:6]}-{d[6:10]}-{d[10:14]}"
    return digits

def find_user_by_identifier(identifier: str):
    """
    Looks up a User by Aadhaar, ABHA ID, Mobile Phone, Email, or Username.
    Returns (user, patient_profile, detected_type) or (None, None, detected_type).
    """
    if not identifier:
        return None, None, 'unknown'

    val = identifier.strip()
    digits = clean_digits(val)
    detected_type = detect_identifier_type(val)

    user = None
    profile = None

    # 1. Search by Aadhaar (12 digits)
    if detected_type == 'aadhaar' or len(digits) == 12:
        formatted_1 = format_aadhaar(digits)
        formatted_2 = f"{digits[0:4]}-{digits[4:8]}-{digits[8:12]}"
        profile = PatientProfile.objects.filter(
            Q(mock_aadhaar_id=digits) |
            Q(mock_aadhaar_id=formatted_1) |
            Q(mock_aadhaar_id=formatted_2) |
            Q(mock_aadhaar_id__icontains=digits)
        ).first()
        if profile:
            return profile.user, profile, 'aadhaar'

    # 2. Search by ABHA ID / Address
    if detected_type == 'abha' or len(digits) == 14 or val.startswith('14-'):
        formatted_abha = format_abha(digits) if len(digits) == 14 else val
        profile = PatientProfile.objects.filter(
            Q(mock_abha_id__iexact=val) |
            Q(mock_abha_id__iexact=formatted_abha) |
            Q(mock_abha_id__icontains=digits if len(digits) >= 10 else val)
        ).first()
        if profile:
            return profile.user, profile, 'abha'

    # 3. Search by Mobile Phone
    if detected_type == 'mobile' or (len(digits) >= 10 and len(digits) <= 13):
        phone_10 = digits[-10:]
        profile = PatientProfile.objects.filter(
            Q(phone=phone_10) |
            Q(phone__endswith=phone_10)
        ).first()
        if profile:
            return profile.user, profile, 'mobile'

    # 4. Search by Email
    if '@' in val:
        user = User.objects.filter(email__iexact=val).first()
        if user:
            profile = getattr(user, 'patient_profile', None)
            return user, profile, 'email'

    # 5. Search by Username
    user = User.objects.filter(username__iexact=val).first()
    if user:
        profile = getattr(user, 'patient_profile', None)
        return user, profile, detected_type

    # 6. Fallback across all fields if still not found
    if digits and len(digits) >= 10:
        profile = PatientProfile.objects.filter(
            Q(phone__icontains=digits[-10:]) |
            Q(mock_abha_id__icontains=digits) |
            Q(mock_aadhaar_id__icontains=digits)
        ).first()
        if profile:
            return profile.user, profile, detected_type

    return None, None, detected_type

def get_or_create_patient_by_identifier(identifier: str, name: str = None, age: int = None, gender: str = None, preferred_language: str = 'en'):
    """
    Finds existing patient or seamlessly provisions a new patient user.
    Takes user input for age and name rather than assigning arbitrary numbers.
    """
    user, profile, id_type = find_user_by_identifier(identifier)
    if user:
        # If user found, update profile details if provided
        updated_fields = []
        if profile:
            if id_type == 'aadhaar' and not profile.mock_aadhaar_id:
                profile.mock_aadhaar_id = format_aadhaar(clean_digits(identifier))
                updated_fields.append('mock_aadhaar_id')
            if age is not None and age > 0:
                profile.age = age
                updated_fields.append('age')
            if name and (not profile.name or profile.name.startswith("Citizen")):
                profile.name = name
                updated_fields.append('name')
            if gender and gender != profile.gender:
                profile.gender = gender
                updated_fields.append('gender')
            if updated_fields:
                profile.save(update_fields=updated_fields)
        return user, profile, id_type, False

    # Create new patient user
    val = identifier.strip()
    digits = clean_digits(val)

    first_name = (name or '').split()[0] if name else 'Patient'
    last_name = ' '.join((name or '').split()[1:]) if (name and len(name.split()) > 1) else ''

    # Generate unique username
    suffix = digits[-6:] if len(digits) >= 6 else str(random.randint(100000, 999999))
    base_username = f"pt_{id_type}_{suffix}"
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}_{counter}"
        counter += 1

    email = val if id_type == 'email' else f"{username}@medikiosk.in"
    phone = digits[-10:] if len(digits) >= 10 else f"98{random.randint(10000000, 99999999)}"

    user = User.objects.create(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        role=User.Role.PATIENT
    )
    user.set_unusable_password()
    user.save()

    # Generate or format ABHA & Aadhaar
    if id_type == 'aadhaar':
        mock_aadhaar = format_aadhaar(digits)
        rand_12 = ''.join([str(random.randint(0, 9)) for _ in range(12)])
        mock_abha = f"14-{rand_12[0:4]}-{rand_12[4:8]}-{rand_12[8:12]}"
    elif id_type == 'abha':
        mock_abha = format_abha(digits) if len(digits) == 14 else val
        rand_12 = ''.join([str(random.randint(0, 9)) for _ in range(12)])
        mock_aadhaar = format_aadhaar(rand_12)
    else:
        rand_12a = ''.join([str(random.randint(0, 9)) for _ in range(12)])
        rand_12b = ''.join([str(random.randint(0, 9)) for _ in range(12)])
        mock_abha = f"14-{rand_12a[0:4]}-{rand_12a[4:8]}-{rand_12a[8:12]}"
        mock_aadhaar = format_aadhaar(rand_12b)

    profile = PatientProfile.objects.create(
        user=user,
        name=name or f"Citizen {suffix}",
        age=age,
        gender=gender or PatientProfile.Gender.OTHER,
        phone=phone,
        preferred_language=preferred_language or 'en',
        mock_abha_id=mock_abha,
        mock_aadhaar_id=mock_aadhaar
    )

    return user, profile, id_type, True

def generate_and_save_otp(identifier: str, id_type: str = 'AUTO') -> str:
    """
    Generates a secure 6-digit OTP code and persists to OTPVerification.
    Returns the otp code.
    """
    otp_code = f"{random.randint(100000, 999999)}"

    OTPVerification.objects.create(
        identifier=identifier.strip(),
        otp_code=otp_code,
        identifier_type=id_type.upper()
    )
    return otp_code

def verify_otp_code(identifier: str, otp_code: str) -> bool:
    """
    Verifies the OTP code against active database records.
    """
    if not otp_code:
        return False

    code = otp_code.strip()
    val = identifier.strip()
    digits = clean_digits(val)

    records = OTPVerification.objects.filter(otp_code=code, is_verified=False)
    for rec in records:
        rec_digits = clean_digits(rec.identifier)
        matches = False
        if rec.identifier.strip().lower() == val.lower():
            matches = True
        elif digits and rec_digits:
            if digits == rec_digits or (len(digits) >= 10 and len(rec_digits) >= 10 and digits[-10:] == rec_digits[-10:]):
                matches = True

        if matches:
            if rec.is_valid():
                rec.is_verified = True
                rec.save(update_fields=['is_verified'])
                return True

    return False


def get_client_ip(request) -> str:
    """Extracts client IP address safely from Django request."""
    if not request:
        return '127.0.0.1'
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')


def record_security_incident(event_type: str, identifier: str, details: str, risk_level: str = 'LOW', ip: str = '127.0.0.1'):
    """Records security events, spam occurrences, and admin interventions."""
    try:
        return SecurityAuditLog.objects.create(
            event_type=event_type,
            identifier=str(identifier)[:150],
            ip_address=str(ip)[:64],
            risk_level=risk_level,
            details=details
        )
    except Exception as e:
        print(f"Failed to log security incident: {e}")
        return None


def check_identifier_blocked(identifier: str, ip: str = '127.0.0.1'):
    """
    Checks if an identifier (Aadhaar, ABHA, Phone, Email, Username, or IP)
    is blacklisted in BlockedIdentifier or belongs to a flagged spammer / inactive user.
    Returns (is_blocked: bool, reason: str or None)
    """
    if not identifier:
        return False, None

    val = str(identifier).strip()
    digits = clean_digits(val)

    # 1. Check IP address
    if ip and ip != '127.0.0.1':
        blocked_ip = BlockedIdentifier.objects.filter(identifier=ip, is_active=True).first()
        if blocked_ip:
            return True, f"IP {ip} is blacklisted: {blocked_ip.reason}"

    # 2. Check identifier in BlockedIdentifier table
    q_filter = Q(identifier__iexact=val)
    if len(digits) >= 10:
        q_filter |= Q(identifier__icontains=digits[-10:])
    if len(digits) == 12:
        q_filter |= Q(identifier__icontains=format_aadhaar(digits))
    if len(digits) == 14:
        q_filter |= Q(identifier__icontains=format_abha(digits))

    blocked = BlockedIdentifier.objects.filter(q_filter, is_active=True).first()
    if blocked:
        return True, f"{blocked.reason}"

    # 3. Check if user is inactive or flagged as spammer
    user, _, _ = find_user_by_identifier(val)
    if user:
        if not user.is_active:
            return True, "Account has been suspended by system administrator."
        if user.is_flagged_spammer:
            reason = user.spam_notes or "Account flagged for suspicious activity or spam."
            return True, f"Account flagged for spam: {reason}"

    return False, None


def check_otp_rate_limit(identifier: str, ip: str = '127.0.0.1'):
    """
    Rate limiting for OTP dispatch to prevent spam attacks and SMS exhaustion.
    Flags spam score if flood is detected.
    """
    five_minutes_ago = timezone.now() - timedelta(minutes=5)
    digits = clean_digits(identifier)

    recent_otps = OTPVerification.objects.filter(
        Q(identifier__iexact=identifier) |
        Q(identifier__icontains=digits[-10:] if len(digits) >= 10 else identifier),
        created_at__gte=five_minutes_ago
    ).count()

    if recent_otps >= 6:
        record_security_incident(
            event_type=SecurityAuditLog.EventType.OTP_FLOOD,
            identifier=identifier,
            ip=ip,
            risk_level=SecurityAuditLog.RiskLevel.HIGH,
            details=f"Excessive OTP requests: {recent_otps} requests within 5 minutes."
        )
        user, _, _ = find_user_by_identifier(identifier)
        if user:
            user.spam_score = min(user.spam_score + 25, 100)
            if user.spam_score >= 75 and not user.is_flagged_spammer:
                user.is_flagged_spammer = True
                user.spam_notes = "Auto-flagged: Repeated OTP flood abuse"
            user.save(update_fields=['spam_score', 'is_flagged_spammer', 'spam_notes'])
        return True, "Rate limit exceeded. Too many OTP requests. Please wait 5 minutes before trying again."

    return False, None

