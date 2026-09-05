from django.apps import AppConfig

class TriageConfig(AppConfig):
    name = 'triage'

    def ready(self):
        import triage.signals

