from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Seeds initial demonstration data for MediKiosk (Accounts, Intake, Documents, Summary, Consent, Triage)'

    def handle(self, *args, **options):
        self.stdout.write("Running full MediKiosk database seed...")
        call_command('seed_accounts')
        call_command('seed_demo_journey')
        self.stdout.write(self.style.SUCCESS("✓ Successfully seeded complete MediKiosk database!"))

