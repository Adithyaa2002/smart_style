import os
import re

uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads')

for file in os.listdir(uploads_dir):
    if file.endswith('.glb'):
        print(f"--- {file} ---")
        try:
            with open(os.path.join(uploads_dir, file), 'rb') as f:
                content = f.read()
                # find all ascii strings of length > 3
                strings = re.findall(b'[a-zA-Z0-9_\-]{4,}', content)
                # print strings that might be morph targets
                shapekeys = set()
                for s in strings:
                    s_str = s.decode('utf-8')
                    if any(x in s_str.lower() for x in ['size', 'measure', 'bust', 'waist', 'hip', 'target', 'morph', 'large', 'small', 'medium']):
                        shapekeys.add(s_str)
                print(shapekeys)
        except Exception as e:
            pass
