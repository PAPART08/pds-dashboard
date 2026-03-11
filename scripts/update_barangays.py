import pandas as pd
import json

df = pd.read_csv('Code Tables/Barangays.csv')
# The columns are likely: REGION, PROVINCE, CITY/MUNICIPALITY, BARANGAY.
# Clean and deduplicate.
df = df.dropna(subset=['CITY/MUNICIPALITY', 'BARANGAY'])

# Create a dictionary of { city_municipality: sorted_list_of_unique_barangays }
muni_to_brgy = {}
for index, row in df.iterrows():
    muni = str(row['CITY/MUNICIPALITY']).strip()
    brgy = str(row['BARANGAY']).strip()
    
    # Capitalize appropriately or leave as is? Let's leave as is for now, maybe capitalize title
    # Actually wait, let's keep it as is but sort uniquely
    if muni not in muni_to_brgy:
        muni_to_brgy[muni] = set()
    muni_to_brgy[muni].add(brgy)

# Convert sets to sorted lists
muni_to_brgy = {k: sorted(list(v)) for k, v in muni_to_brgy.items()}

# Load codes.json
with open('src/lib/codes.json', 'r') as f:
    codes = json.load(f)

print("Old number of barangay municipalities:", len(codes.get('barangays', {})))
codes['barangays'] = muni_to_brgy
print("New number of barangay municipalities:", len(muni_to_brgy))

# Write back
with open('src/lib/codes.json', 'w') as f:
    json.dump(codes, f, indent=2)

print("Successfully updated codes.json with new barangay list.")
