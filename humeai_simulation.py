import random
import os

# Define dataset paths (placeholders)
POS = '/content/drive/MyDrive/audio/data/Parsed_Capuchinbird_Clips'
NEG = '/content/drive/MyDrive/audio/data/Parsed_Not_Capuchinbird_Clips'

def humeai_generate_scores(categories, is_violent):
    """Generating scores from the Hume AI dataset."""
    if is_violent:
        return {cat: random.uniform(5, 10) for cat in categories}
    else:
        return {cat: random.uniform(0, 6) for cat in categories}

def simulate_dataset_interaction():
    """Simulate interaction with the dataset via API."""
    categories = ['fear', 'anger', 'sadness', 'anxiety', 'panic', 'resistance', 'terror', 'stress']
    
    # Simulate file paths
    violence_file = os.path.join(POS, 'sample_violent.wav')
    not_violence_file = os.path.join(NEG, 'sample_not_violent.wav')
    
    # Simulate making API requests
    violence_response = humeai_generate_scores(categories, True)
    not_violence_response = humeai_generate_scores(categories, False)
    
    # Print out responses
    print(f"API Response for {violence_file}: {violence_response}")
    print(f"API Response for {not_violence_file}: {not_violence_response}")
    
    print("Simulated dataset interaction complete.")

# Uncomment the following line to run the simulation directly
# simulate_dataset_interaction()
