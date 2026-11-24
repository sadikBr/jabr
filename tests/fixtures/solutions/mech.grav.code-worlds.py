import math

WORLDS = {"Earth": 9.81, "Moon": 1.62, "Mars": 3.71, "Jupiter": 24.79}

def weight(mass, g):
    """The weight, in newtons, of `mass` kilograms where gravity is `g`."""
    return mass * g

def fall_time(height, g):
    """Seconds to fall `height` metres from rest, with no air."""
    return math.sqrt(2 * height / g)

print("world     weight of 70 kg   time to fall 2 m")
for world, g in WORLDS.items():
    print(f"{world:<9} {weight(70, g):>13.0f} N {fall_time(2, g):>16.2f} s")
