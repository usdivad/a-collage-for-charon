"""Choose MIDI notes for Morse using a Markov chain."""
import json
import random

import makersmarkov

# Settings
# TODO: Have this be dynamic
current_track_name = "02. Moondrops_8x.mp3"
num_notes = 12

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
seed_sequence = random.choice(current_track_sequences)
seed_sequence = [note for note in sequence if note != ""]
matrix = makersmarkov.transition_matrix(seed_sequence, 1)
print("seed_sequence: {}".format(seed_sequence))
print("matrix: {}".format(matrix))

# Create new sequence of notes
generated_sequence = makersmarkov.chain(matrix, num_notes)
print("generated_sequence: {}".format(generated_sequence))
