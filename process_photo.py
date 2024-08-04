import json
import sys
from humeai_simulation import humeai_generate_scores

def process_photo(photo_path):
    """Process the photo and generate scores using Hume AI simulation."""
    # Define attacker-related emotion categories
    categories = ['Aggression', 'Hostility', 'Frustration']
    # All photos are classified as 'violent'
    is_violent = True
    
    # Generate scores based on classification using Hume AI simulation
    scores = humeai_generate_scores(categories, is_violent)
    
    return scores

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python process_photo.py <photo_path>")
        sys.exit(1)

    photo_path = sys.argv[1]
    result = process_photo(photo_path)
    print(json.dumps(result))