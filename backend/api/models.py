from django.db import models

class Patient(models.Model):
    patient_id = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=128)
    age = models.IntegerField(default=38)
    gender = models.CharField(max_length=32, default="Female")
    blood_group = models.CharField(max_length=8, default="A+")
    allergies = models.JSONField(default=list, blank=True)
    emergency_contact = models.CharField(max_length=64, default="+1 (555) 382-9912 (Spouse)")
    primary_doctor = models.CharField(max_length=128, default="Dr. Michael Chen, MD (Cardiology)")
    pin = models.CharField(max_length=16, default="1234")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.patient_id})"


class Vitals(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="vitals_history")
    heart_rate = models.IntegerField(default=74)
    bp_systolic = models.IntegerField(default=118)
    bp_diastolic = models.IntegerField(default=78)
    spo2 = models.IntegerField(default=99)
    temperature = models.FloatField(default=98.4)
    glucose = models.IntegerField(default=92)
    weight_kg = models.FloatField(default=64.0)
    height_cm = models.FloatField(default=168.0)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"Vitals for {self.patient.name} at {self.recorded_at}"


class MedicalDocument(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=255)
    doc_type = models.CharField(max_length=64, default="Prescription")
    facility = models.CharField(max_length=128, default="Metro General Hospital")
    doctor = models.CharField(max_length=128, default="Dr. Michael Chen, MD")
    diagnosis = models.TextField(blank=True, default="")
    extracted_text = models.TextField(blank=True, default="")
    confidence = models.CharField(max_length=16, default="99.4%")
    file = models.FileField(upload_to="documents/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.patient.name})"


class Medication(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="medications")
    document = models.ForeignKey(MedicalDocument, on_delete=models.SET_NULL, null=True, blank=True, related_name="medications")
    name = models.CharField(max_length=128)
    dose = models.CharField(max_length=64, default="500 mg")
    frequency = models.CharField(max_length=64, default="3 times daily")
    duration = models.CharField(max_length=64, default="7 days")
    instruction = models.CharField(max_length=255, default="Take after meals")
    timing = models.CharField(max_length=64, default="Morning, Noon, Night")
    status = models.CharField(max_length=32, default="Active")
    taken_today = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.patient.name}"


class Conversation(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="conversations")
    title = models.CharField(max_length=128, default="New Consultation")
    language = models.CharField(max_length=16, default="en") # "en", "hi", "hinglish"
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.language})"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages", null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="chat_messages")
    sender = models.CharField(max_length=16, default="agent") # 'patient' or 'agent'
    text = models.TextField()
    language = models.CharField(max_length=16, default="en") # 'en', 'hi', 'hinglish'
    urgency = models.CharField(max_length=16, default="normal") # 'normal', 'caution', 'alert'
    quick_replies = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender}] {self.text[:30]}"
