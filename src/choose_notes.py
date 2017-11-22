"""Choose MIDI notes for Morse using a Markov chain."""
import json
import random

import makersmarkov

# Settings
# TODO: Have this be dynamic
current_track_name = "02. Moondrops_8x.mp3"

# Load data from JSON
data = {}
with open("../data/track_sequences.json", "r") as f:
    data = json.load(f)
    # print(data)

# Clean data a bit
# Turn sequences into list of lists instead of dict of lists
# TODO: Maybe only do this for current_track_name, depending on implementation
for track_name in data:
    track = data[track_name]
    sequences_dict = track["sequences"]
    sequences_list = []
    for sequence_name in sequences_dict:
        sequence = sequences_dict[sequence_name]
        sequences_list.append(sequence)
    data[track_name]["sequences"] = sequences_list
# print(data)

# Create transition matrix
current_track_sequences = data[current_track_name]["sequences"]
sequence = random.choice(current_track_sequences)
matrix = makersmarkov.transition_matrix(sequence, 1)
print(matrix)
