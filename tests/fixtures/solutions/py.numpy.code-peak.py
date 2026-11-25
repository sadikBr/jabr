import numpy as np

def peak(speed):
    """The greatest height reached by a ball thrown upwards at `speed` m/s."""
    t = np.linspace(0, speed / 4.9, 1001)
    h = speed * t - 4.9 * t**2
    return h.max()

for speed in [10, 20, 30]:
    print(f"Thrown at {speed} m/s, it reaches {peak(speed):.2f} m")
