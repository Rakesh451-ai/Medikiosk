from django.dispatch import Signal

# Signal dispatched when red-flag clinical patterns are detected in patient input
# providing_args: ['session', 'red_flag_reason', 'raw_text']
red_flag_detected = Signal()
