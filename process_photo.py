import json
import sys
from humeai_simulation import humeai_generate_scores

def process_photo(photo_path, output_json_path):
    """Process the photo, generate scores using Hume AI simulation, and write to JSON file."""
    # Define attacker-related emotion categories
    categories = ['Aggression', 'Hostility', 'Frustration']
    # All photos are classified as 'violent'
    is_violent = True
    
    # Generate scores based on classification using Hume AI simulation
    scores = humeai_generate_scores(categories, is_violent)
    
    # Prepare the output data
    result = scores
    
    # Write to JSON file
    with open(output_json_path, 'w') as json_file:
        json.dump(result, json_file, indent=4)

    print(f'Output written to: {output_json_path}')

if __name__ == "__main__":
    photo_path = sys.argv[1]  # Photo file path passed as argument
    output_json_path = sys.argv[2]  # Output JSON file path passed as argument
    process_photo(photo_path, output_json_path)