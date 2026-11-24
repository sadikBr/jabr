def bisect(f, lo, hi, tolerance=1e-6):
    """A root of f between lo and hi, where f(lo) and f(hi) have opposite signs."""
    while hi - lo > tolerance:
        mid = (lo + hi) / 2
        if f(lo) * f(mid) <= 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2

def f(x):
    return x**3 - x - 2

root = bisect(f, 1, 2)
print(f"root is about {root:.5f}")
print(f"f(root) = {f(root):.2e}")
