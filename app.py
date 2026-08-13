import sys

T = "\033[38;2;0;245;212m"   # Teal / Active
G = "\033[38;2;80;250;123m"  # Green / Verified
R = "\033[0m"                # Reset

print(f"\n{T}=== Envictica Fiduciary Systems v4.02 ==={R}")
print(f"| Core Governance Kernel: {T}ONLINE{R}")
print(f"| Fiduciary Risk Engine:  {T}NOMINAL{R}")
print("-" * 45)
print("REQUIRED SYSTEM BINDINGS:")
print(f"| Jurisdiction Profile -> {G}[✓ US-DE / CORPORATE]{R}")
print(f"| Mandate Type         -> {G}[✓ FIDUCIARY_DIRECT]{R}")
print(f"| Entity Class         -> {G}[✓ CLASS_A_VERIFIED]{R}")
print("-" * 45)
