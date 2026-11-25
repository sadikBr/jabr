import numpy as np

def average_speeds(times, distances):
    """The average speed between each reading and the next, as an array."""
    return np.diff(distances) / np.diff(times)

times = np.array([0, 1.89, 2.88, 3.78, 4.64, 5.47, 6.29, 7.10, 7.92, 8.75, 9.58])
distances = np.arange(0, 101, 10)

speeds = average_speeds(times, distances)
print(np.round(speeds, 2))
print("Fastest:", speeds.max().round(2), "m/s, in stretch number", np.argmax(speeds) + 1)
