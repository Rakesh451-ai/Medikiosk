import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import PatientProfile, DoctorProfile, TriageStaffProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds MediKiosk demo accounts: Doctors, Triage Staff, Patients, and Admin'

    def handle(self, *args, **options):
        self.stdout.write("Seeding MediKiosk accounts and user roles...")

        # 1. Admin
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@medikiosk.health',
                'first_name': 'System',
                'last_name': 'Admin',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin_user.set_password('AdminPass123!')
        admin_user.role = User.Role.ADMIN
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        self.stdout.write(self.style.SUCCESS("✓ Admin user created: admin / AdminPass123!"))

        # 2. Doctors
        doctors_data = [
            {
                'username': 'dr_sharma',
                'email': 'dr.sharma@medikiosk.health',
                'name': 'Rajesh Sharma',
                'department': 'General Medicine',
                'specialization': 'Consultant Physician',
                'room_number': 'OPD Room 3',
            },
            {
                'username': 'dr_sen',
                'email': 'dr.sen@medikiosk.health',
                'name': 'Ananya Sen',
                'department': 'Pulmonology & Critical Care',
                'specialization': 'Senior Pulmonologist',
                'room_number': 'OPD Room 7',
            }
        ]

        for d in doctors_data:
            doc_user, _ = User.objects.get_or_create(
                username=d['username'],
                defaults={
                    'email': d['email'],
                    'first_name': d['name'].split()[0],
                    'last_name': d['name'].split()[1],
                    'role': User.Role.DOCTOR,
                    'is_staff': True,
                }
            )
            doc_user.set_password('DoctorPass123!')
            doc_user.role = User.Role.DOCTOR
            doc_user.is_staff = True
            doc_user.save()

            DoctorProfile.objects.update_or_create(
                user=doc_user,
                defaults={
                    'name': d['name'],
                    'department': d['department'],
                    'specialization': d['specialization'],
                    'room_number': d['room_number'],
                }
            )
            self.stdout.write(self.style.SUCCESS(f"✓ Doctor created: {d['username']} / DoctorPass123! ({d['name']})"))

        # 3. Triage Staff
        triage_staff_data = [
            {
                'username': 'nurse_priya',
                'email': 'priya.nair@medikiosk.health',
                'name': 'Priya Nair',
                'station_id': 'Kiosk Station 01',
                'shift': 'Morning (08:00 - 16:00)',
            },
            {
                'username': 'triage_vikram',
                'email': 'vikram.singh@medikiosk.health',
                'name': 'Vikram Singh',
                'station_id': 'Emergency Rapid Triage',
                'shift': 'Evening (16:00 - 24:00)',
            }
        ]

        for s in triage_staff_data:
            staff_user, _ = User.objects.get_or_create(
                username=s['username'],
                defaults={
                    'email': s['email'],
                    'first_name': s['name'].split()[0],
                    'last_name': s['name'].split()[1],
                    'role': User.Role.TRIAGE_STAFF,
                    'is_staff': True,
                }
            )
            staff_user.set_password('StaffPass123!')
            staff_user.role = User.Role.TRIAGE_STAFF
            staff_user.is_staff = True
            staff_user.save()

            TriageStaffProfile.objects.update_or_create(
                user=staff_user,
                defaults={
                    'name': s['name'],
                    'station_id': s['station_id'],
                    'shift': s['shift'],
                }
            )
            self.stdout.write(self.style.SUCCESS(f"✓ Triage Staff created: {s['username']} / StaffPass123! ({s['name']})"))

        # 4. Patients
        patients_data = [
            {
                'username': 'sarah_jenkins',
                'email': 'sarah.jenkins@example.com',
                'name': 'Sarah Jenkins',
                'age': 38,
                'gender': PatientProfile.Gender.FEMALE,
                'phone': '9123456780',
                'preferred_language': 'en',
                'mock_abha_id': '14-8921-3490-1284',
                'mock_aadhaar_id': '5521 8934 1284',
            },
            {
                'username': 'ramesh_patel',
                'email': 'ramesh.patel@example.com',
                'name': 'Ramesh Patel',
                'age': 54,
                'gender': PatientProfile.Gender.MALE,
                'phone': '9876543210',
                'preferred_language': 'hi',
                'mock_abha_id': '14-4512-8809-3321',
                'mock_aadhaar_id': '8890 4512 3321',
            },
            {
                'username': 'sunita_devi',
                'email': 'sunita.devi@example.com',
                'name': 'Sunita Devi',
                'age': 29,
                'gender': PatientProfile.Gender.FEMALE,
                'phone': '9811223344',
                'preferred_language': 'hi',
                'mock_abha_id': '14-7721-6543-9012',
                'mock_aadhaar_id': '7733 6543 9012',
            }
        ]

        for p in patients_data:
            pat_user, _ = User.objects.get_or_create(
                username=p['username'],
                defaults={
                    'email': p['email'],
                    'first_name': p['name'].split()[0],
                    'last_name': p['name'].split()[1],
                    'role': User.Role.PATIENT,
                }
            )
            pat_user.set_password('PatientPass123!')
            pat_user.role = User.Role.PATIENT
            pat_user.save()

            PatientProfile.objects.update_or_create(
                user=pat_user,
                defaults={
                    'name': p['name'],
                    'age': p['age'],
                    'gender': p['gender'],
                    'phone': p['phone'],
                    'preferred_language': p['preferred_language'],
                    'mock_abha_id': p['mock_abha_id'],
                    'mock_aadhaar_id': p['mock_aadhaar_id'],
                }
            )
            self.stdout.write(self.style.SUCCESS(f"✓ Patient created: {p['username']} / PatientPass123! ({p['name']}, ABHA: {p['mock_abha_id']}, Aadhaar: {p['mock_aadhaar_id']})"))

        # 5. Flagged Spammer Account
        spammer_user, _ = User.objects.get_or_create(
            username='bot_crawler_01',
            defaults={
                'email': 'bot_crawler@badproxy.net',
                'first_name': 'Scraper',
                'last_name': 'Bot',
                'role': User.Role.PATIENT,
                'is_active': False,
                'is_flagged_spammer': True,
                'spam_score': 92,
                'spam_notes': 'Automated bot: 45 OTP requests within 3 minutes from proxy IP',
            }
        )
        spammer_user.is_flagged_spammer = True
        spammer_user.is_active = False
        spammer_user.spam_score = 92
        spammer_user.spam_notes = 'Automated bot: 45 OTP requests within 3 minutes from proxy IP'
        spammer_user.save()

        # 6. Blacklisted / Blocked Identifiers
        from accounts.models import BlockedIdentifier, SecurityAuditLog
        blocked_entries = [
            {
                'identifier': '9999999999',
                'identifier_type': BlockedIdentifier.IdentifierType.PHONE,
                'reason': 'High-frequency OTP flood and fake identity injection attempts',
            },
            {
                'identifier': '198.51.100.42',
                'identifier_type': BlockedIdentifier.IdentifierType.IP,
                'reason': 'Credential brute force attack targeting patient login API',
            },
            {
                'identifier': '0000 0000 0000',
                'identifier_type': BlockedIdentifier.IdentifierType.AADHAAR,
                'reason': 'Forged Aadhaar ID checksum and duplicate biometric spoof',
            },
            {
                'identifier': 'spammer_bot@fakemail.io',
                'identifier_type': BlockedIdentifier.IdentifierType.EMAIL,
                'reason': 'Reported malicious phishing attempt in feedback forms',
            },
        ]
        for b in blocked_entries:
            BlockedIdentifier.objects.update_or_create(
                identifier=b['identifier'],
                defaults={
                    'identifier_type': b['identifier_type'],
                    'reason': b['reason'],
                    'is_active': True,
                    'blocked_by': admin_user,
                }
            )

        # 7. Initial Security Audit Logs
        sample_logs = [
            {
                'event_type': SecurityAuditLog.EventType.OTP_FLOOD,
                'identifier': '9999999999',
                'ip_address': '198.51.100.42',
                'risk_level': SecurityAuditLog.RiskLevel.HIGH,
                'details': 'Automated rate limit triggered: 14 OTP requests in 60 seconds.',
            },
            {
                'event_type': SecurityAuditLog.EventType.FAILED_LOGIN,
                'identifier': 'sarah_jenkins',
                'ip_address': '192.168.1.105',
                'risk_level': SecurityAuditLog.RiskLevel.LOW,
                'details': 'Single failed PIN entry on OPD kiosk station.',
            },
            {
                'event_type': SecurityAuditLog.EventType.SPAM_DETECTED,
                'identifier': '0000 0000 0000',
                'ip_address': '103.21.244.0',
                'risk_level': SecurityAuditLog.RiskLevel.CRITICAL,
                'details': 'UIDAI verification gateway rejected invalid Aadhaar checksum.',
            },
            {
                'event_type': SecurityAuditLog.EventType.USER_BANNED,
                'identifier': 'bot_crawler_01',
                'ip_address': '198.51.100.42',
                'risk_level': SecurityAuditLog.RiskLevel.HIGH,
                'details': 'Account automatically suspended and blacklisted by security engine.',
            },
        ]
        for l in sample_logs:
            SecurityAuditLog.objects.get_or_create(
                event_type=l['event_type'],
                identifier=l['identifier'],
                ip_address=l['ip_address'],
                details=l['details'],
                defaults={'risk_level': l['risk_level']}
            )

        self.stdout.write(self.style.SUCCESS("✓ Demo spammers, blacklist, and security logs seeded successfully!"))
        self.stdout.write(self.style.SUCCESS("\nAll demo accounts and security configurations ready!"))

