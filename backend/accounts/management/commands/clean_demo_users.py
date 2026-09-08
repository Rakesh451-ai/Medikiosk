from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import (
    PatientProfile,
    DoctorProfile,
    TriageStaffProfile,
    OTPVerification,
    BlockedIdentifier,
    SecurityAuditLog,
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Removes all demo users and initializes a clean, secure administrator account'

    def handle(self, *args, **options):
        self.stdout.write("Purging all demo and mock patient accounts...")

        # 1. Delete demo patient users
        demo_usernames = [
            'sarah_jenkins',
            'ramesh_patel',
            'sunita_devi',
            'bot_crawler_01',
            'test_patient',
            'test_staff',
            'nurse_priya',
            'triage_vikram',
        ]
        
        # Delete demo users by explicit list and pattern
        deleted_count = 0
        for u in User.objects.all():
            if (
                u.username in demo_usernames or
                u.username.startswith('pt_') or
                u.email.endswith(('@example.com', '@badproxy.net')) or
                (u.role == User.Role.PATIENT and u.username != 'admin')
            ):
                u.delete()
                deleted_count += 1

        self.stdout.write(self.style.SUCCESS(f"✓ Removed {deleted_count} demo and temporary patient accounts."))

        # 2. Clear dummy OTP verifications
        otp_count = OTPVerification.objects.count()
        OTPVerification.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"✓ Cleared {otp_count} old OTP records."))

        # 3. Create or Reset Clean Superuser Administrator
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@medikiosk.in',
                'first_name': 'System',
                'last_name': 'Administrator',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )
        admin_user.set_password('AdminPass123!')
        admin_user.email = 'admin@medikiosk.in'
        admin_user.first_name = 'System'
        admin_user.last_name = 'Administrator'
        admin_user.role = User.Role.ADMIN
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.is_active = True
        admin_user.is_flagged_spammer = False
        admin_user.spam_score = 0
        admin_user.save()
        self.stdout.write(self.style.SUCCESS("✓ Secure Administrator created: 'admin' / 'AdminPass123!' (Role: ADMIN, Superuser: True)"))

        # 4. Create or Reset Doctor Account
        doc_user, _ = User.objects.get_or_create(
            username='dr_sharma',
            defaults={
                'email': 'dr.sharma@medikiosk.in',
                'first_name': 'Rajesh',
                'last_name': 'Sharma',
                'role': User.Role.DOCTOR,
                'is_staff': True,
                'is_active': True,
            }
        )
        doc_user.set_password('DoctorPass123!')
        doc_user.role = User.Role.DOCTOR
        doc_user.is_staff = True
        doc_user.is_active = True
        doc_user.save()
        DoctorProfile.objects.update_or_create(
            user=doc_user,
            defaults={
                'name': 'Rajesh Sharma, MD',
                'department': 'General Medicine',
                'specialization': 'Chief Medical Consultant',
                'room_number': 'OPD Room 3',
            }
        )
        self.stdout.write(self.style.SUCCESS("✓ Clinical Doctor created: 'dr_sharma' / 'DoctorPass123!' (Role: DOCTOR)"))

        self.stdout.write(self.style.SUCCESS("\nSQLite database cleaned and prepared for real user registrations."))
