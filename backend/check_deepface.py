try:
    from deepface import DeepFace
    print('DeepFace available')
except ImportError as e:
    print(f'DeepFace not available: {e}')