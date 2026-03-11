import os
import re

uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads')
output_path = os.path.join(os.path.dirname(__file__), 'log_out2.txt')

with open(output_path, 'w', encoding='utf-8') as out:
    for file in os.listdir(uploads_dir):
        if file.endswith('3final.glb') or file.endswith('dress1.glb'):
            out.write(f"--- {file} ---\n")
            try:
                with open(os.path.join(uploads_dir, file), 'rb') as f:
                    content = f.read()
                    if b'morphTarget' in content:
                        out.write("Has morphTarget string in file!\n")
                    else:
                        out.write("No morph targets found in file bytes.\n")
            except Exception as e:
                pass
