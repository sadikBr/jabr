def f(x):
    return x**3

def secant_slope(f, x, h):
    return (f(x + h) - f(x)) / h

# Shrink h and watch the slope settle on one number.
for h in [1, 0.1, 0.01, 0.001]:
    print(f"h = {h:<6} slope = {secant_slope(f, 2, h):.4f}")
