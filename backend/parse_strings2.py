import os
import re

uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads')

for file in os.listdir(uploads_dir):
    if file.endswith('.glb'):
        print(f"--- {file} ---")
        try:
            with open(os.path.join(uploads_dir, file), 'rb') as f:
                content = f.read()
                strings = re.findall(b'[a-zA-Z0-9_\-]{4,}', content)
                shapekeys = set()
                for s in strings:
                    s_str = s.decode('utf-8')
                    if s_str.startswith('measure-') or s_str.lower() in ['s', 'm', 'l', 'xl', 'small', 'medium', 'large'] or 'size' in s_str.lower():
                        shapekeys.add(s_str)
                print(sorted(list(shapekeys)))
        except Exception as e:
            pass
