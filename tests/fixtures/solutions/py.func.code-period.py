import math

def pendulum_period(length, g=9.8):
    """Seconds for one full swing of a pendulum `length` metres long."""
    return 2 * math.pi * math.sqrt(length / g)

print("A 1 m pendulum on Earth:", pendulum_period(1, 9.8), "s")
print("The same one on the Moon:", pendulum_period(1, 1.62), "s")
