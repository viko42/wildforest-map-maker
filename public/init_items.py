import os
import json

def get_items_structure(root_dir):
    items = {}
    for dirpath, dirnames, filenames in os.walk(root_dir):
        category = os.path.basename(dirpath)
        if category != 'items':
            items[category] = [f for f in filenames if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    return items

items_structure = get_items_structure('items')

with open('items_structure.js', 'w') as f:
    f.write(f"const itemsStructure = {json.dumps(items_structure, indent=2)};")

print("items_structure.js has been generated.")