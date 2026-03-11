import pandas as pd

try:
    print("National Roads Sections columns:")
    df_nr = pd.read_excel('Code Tables/National_Road_Section.xlsx')
    print(df_nr.columns.tolist())
    print(df_nr.head(3))
except Exception as e:
    print(f"Error: {e}")

try:
    print("\nNational Bridges columns:")
    df_nb = pd.read_excel('Code Tables/National_Bridges.xlsx')
    print(df_nb.columns.tolist())
    print(df_nb.head(3))
except Exception as e:
    print(f"Error: {e}")

try:
    print("\nFuture Sections columns:")
    df_fs = pd.read_excel('Code Tables/Future_Sections.xlsx')
    print(df_fs.columns.tolist())
    print(df_fs.head(3))
except Exception as e:
    print(f"Error: {e}")

try:
    print("\nFuture Bridges columns:")
    df_fb = pd.read_csv('Code Tables/Future_Bridges.csv')
    print(df_fb.columns.tolist())
    print(df_fb.head(3))
except Exception as e:
    print(f"Error: {e}")
