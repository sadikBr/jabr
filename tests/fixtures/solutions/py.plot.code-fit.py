import numpy as np
import matplotlib.pyplot as plt

heights = np.array([0.5, 1.0, 1.5, 2.0, 2.5, 3.0])        # metres
measured = np.array([0.33, 0.44, 0.56, 0.63, 0.73, 0.78])  # seconds

def theory(h, g=9.8):
    """The time to fall h metres from rest, for a number or an array."""
    return np.sqrt(2 * h / g)

smooth = np.linspace(0, 3.2, 100)
plt.plot(heights, measured, "o", label="measured")
plt.plot(smooth, theory(smooth), label="theory")
plt.xlabel("height (m)")
plt.ylabel("time to fall (s)")
plt.legend()
plt.grid(True)
plt.show()

print("Biggest gap:", np.abs(measured - theory(heights)).max().round(3), "s")
