import pandas as pd
import json

# Extract Section IDs for National Roads
nr_df = pd.read_excel('Code Tables/National_Road_Section.xlsx', skiprows=1)
nr_dict = {}
for _, row in nr_df.iterrows():
    rname = str(row.iloc[1]).strip() # Assuming Road Name is col 1
    sid = str(row.iloc[4]).strip()   # Assuming Section ID is col 4 (0-indexed)
    # let's just print column names to be sure
print("NR Section columns:", nr_df.columns.tolist())

# Extract Bridge IDs for National Bridges
nb_df = pd.read_excel('Code Tables/National_Bridges.xlsx')
print("NB columns:", nb_df.columns.tolist())

# Extract Future Sections
fs_df = pd.read_excel('Code Tables/Future_Sections.xlsx')
print("FS columns:", fs_df.columns.tolist())

# Extract Future Bridges
fb_df = pd.read_csv('Code Tables/Future_Bridges.csv')
print("FB columns:", fb_df.columns.tolist())

