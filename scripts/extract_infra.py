import pandas as pd
import json
import collections

# ... existing code ...
# 1. Load Geo Boundaries
print("Loading Geo Boundaries...")
geo_df = pd.read_excel('Code Tables/GEOGRAPHIC AND ADMINISTRATIVE BOUNDARIES.xlsx', skiprows=1)
bc_mapping = {}
for _, row in geo_df.iterrows():
    bc = str(row['Boundary\nCode']).strip()
    if bc == '0' or bc == 'nan': continue
    region = str(row['REGION']).strip()
    deo = str(row['DISTRICT ENGINEERING OFFICE']).strip()
    if bc not in bc_mapping:
        bc_mapping[bc] = {'region': region, 'deo': deo}

# 2. Extract National Roads
print("Loading National Roads...")
nr_df = pd.read_csv('Code Tables/National_Road.csv')
deo_to_nr = collections.defaultdict(set)
region_to_nr = collections.defaultdict(set)

for _, row in nr_df.iterrows():
    bc = str(row['Boundary\nCode']).strip()
    name = str(row['Road Name']).strip()
    if name and name != '0' and bc in bc_mapping:
        deo = bc_mapping[bc]['deo']
        region = bc_mapping[bc]['region']
        deo_to_nr[deo].add(name)
        region_to_nr[region].add(name)

# 2.a Extract National Road Sections
print("Loading National Road Sections...")
nrs_df = pd.read_excel('Code Tables/National_Road_Section.xlsx', skiprows=1)
road_name_to_sections = collections.defaultdict(set)
for _, row in nrs_df.iterrows():
    rname = str(row.iloc[3]).strip() # Road Name
    sid = str(row.iloc[1]).strip()   # Section ID
    if rname and rname != '0' and rname != 'nan' and sid and sid != '0' and sid != 'nan' and sid != '-':
        road_name_to_sections[rname].add(sid)

# 3. Extract National Bridges
print("Loading National Bridges...")
nb_df = pd.read_excel('Code Tables/National_Bridges.xlsx')
deo_to_nb = collections.defaultdict(set)
region_to_nb = collections.defaultdict(set)
bridge_name_to_ids = collections.defaultdict(set)

for _, row in nb_df.iterrows():
    bc = str(row['Boundary\nCode']).strip()
    name = str(row['Bridge Name']).strip()
    bid = str(row['Bridge ID']).strip()
    
    if name and name != '0':
        if bid and bid != '0' and bid != 'nan':
            bridge_name_to_ids[name].add(bid)
            
        if bc in bc_mapping:
            deo = bc_mapping[bc]['deo']
            region = bc_mapping[bc]['region']
            deo_to_nb[deo].add(name)
            region_to_nb[region].add(name)

# 4. Extract Future Roads
print("Loading Future Roads...")
fr_df = pd.read_excel('Code Tables/Future_Roads.xlsx')
deo_to_fr = collections.defaultdict(set)
region_to_fr = collections.defaultdict(set)
fr_id_to_geo = {}
future_road_to_sections = collections.defaultdict(set)

for _, row in fr_df.iterrows():
    fr_name = str(row['Future\nRd Name']).strip()
    deo = str(row['DEO']).strip()
    region = str(row['Region']).strip()
    fr_id = str(row['Future\nRoad ID']).strip()
    
    if fr_name and fr_name != '0':
        deo_to_fr[deo].add(fr_name)
        region_to_fr[region].add(fr_name)
    if fr_id:
        fr_id_to_geo[fr_id] = {'region': region, 'deo': deo}

# 4.a Future Sections Mapping
print("Loading Future Sections...")
fs_df = pd.read_excel('Code Tables/Future_Sections.xlsx')
fs_to_fr = {}
fr_id_to_name = dict(zip(fr_df['Future\nRoad ID'].astype(str).str.strip(), fr_df['Future\nRd Name'].astype(str).str.strip()))

for _, row in fs_df.iterrows():
    fs_id = str(row['Future\nSection ID']).strip()
    fr_id = str(row['Future\nRoad ID']).strip()
    if fs_id and fs_id != '0' and fs_id != 'nan':
        fs_to_fr[fs_id] = fr_id
        if fr_id in fr_id_to_name:
            rname = fr_id_to_name[fr_id]
            if rname and rname != '0':
                future_road_to_sections[rname].add(fs_id)

# 5. Extract Future Bridges
print("Loading Future Bridges...")
fb_df = pd.read_csv('Code Tables/Future_Bridges.csv')

deo_to_fb = collections.defaultdict(set)
region_to_fb = collections.defaultdict(set)
future_bridge_to_ids = collections.defaultdict(set)

for _, row in fb_df.iterrows():
    fb_name = str(row['Future\nBridge Name']).strip()
    fs_id = str(row['Future\nSection ID']).strip()
    fb_id = str(row['Future\nBridge ID']).strip()
    
    if fb_name and fb_name != '0':
        if fb_id and fb_id != '0' and fb_id != 'nan':
            future_bridge_to_ids[fb_name].add(fb_id)
            
        if fs_id in fs_to_fr:
            fr_id = fs_to_fr[fs_id]
            if fr_id in fr_id_to_geo:
                deo = fr_id_to_geo[fr_id]['deo']
                region = fr_id_to_geo[fr_id]['region']
                deo_to_fb[deo].add(fb_name)
                region_to_fb[region].add(fb_name)

# Convert sets to sorted lists
def to_dict_list(d):
    return {k: sorted(list(v)) for k, v in d.items()}

infra_data = {
    'deo_to_national_roads': to_dict_list(deo_to_nr),
    'region_to_national_roads': to_dict_list(region_to_nr),
    'deo_to_national_bridges': to_dict_list(deo_to_nb),
    'region_to_national_bridges': to_dict_list(region_to_nb),
    'deo_to_future_roads': to_dict_list(deo_to_fr),
    'region_to_future_roads': to_dict_list(region_to_fr),
    'deo_to_future_bridges': to_dict_list(deo_to_fb),
    'region_to_future_bridges': to_dict_list(region_to_fb),
    
    # ID mappings
    'road_name_to_sections': to_dict_list(road_name_to_sections),
    'bridge_name_to_ids': to_dict_list(bridge_name_to_ids),
    'future_road_to_sections': to_dict_list(future_road_to_sections),
    'future_bridge_to_ids': to_dict_list(future_bridge_to_ids)
}

with open('src/lib/infra_codes.json', 'w') as f:
    json.dump(infra_data, f, indent=2)

print("Generated src/lib/infra_codes.json successfully.")
