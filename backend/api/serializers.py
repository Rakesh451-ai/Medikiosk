from rest_framework import serializers
from .models import Patient, Vitals, MedicalDocument, Medication, Conversation, ChatMessage

class VitalsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vitals
        fields = '__all__'


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = '__all__'


class MedicalDocumentSerializer(serializers.ModelSerializer):
    medications = MedicationSerializer(many=True, read_only=True)

    class Meta:
        model = MedicalDocument
        fields = '__all__'


class ChatMessageSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'conversation', 'patient', 'sender', 'text', 'language', 'urgency', 'quick_replies', 'created_at', 'time']

    def get_time(self, obj):
        return obj.created_at.strftime("%I:%M %p")


class ConversationSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'patient', 'title', 'language', 'created_at', 'updated_at', 'last_message', 'messages_count']

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return msg.text[:60] + ('...' if len(msg.text) > 60 else '')
        return 'No messages yet'

    def get_messages_count(self, obj):
        return obj.messages.count()


class PatientSerializer(serializers.ModelSerializer):
    latest_vitals = serializers.SerializerMethodField()
    medications_count = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'name', 'age', 'gender', 'blood_group', 
            'allergies', 'emergency_contact', 'primary_doctor', 
            'latest_vitals', 'medications_count', 'documents_count', 'created_at'
        ]

    def get_latest_vitals(self, obj):
        v = obj.vitals_history.first()
        if v:
            return VitalsSerializer(v).data
        return None

    def get_medications_count(self, obj):
        return obj.medications.filter(status='Active').count()

    def get_documents_count(self, obj):
        return obj.documents.count()
