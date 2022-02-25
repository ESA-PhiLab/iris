import os
import zarr
import numpy
import gcsfs
from itertools import chain
import pandas as pd
from random import sample
from tqdm import tqdm
from shapely import geometry
from shapely.ops import transform
import pyproj
import numpy as np
from PIL import Image
import json

NORM_CONSTELLATION = {
    'sentinel-2':6000,
    'landsat-8':18000,
    'landsat-7':200,
    'landsat-5':{0:250,1:200,2:200,3:200,4:200,5:200,6:200,7:200},
}

VIS_BANDS = {
    'sentinel-2':(3,2,1),
    'landsat-8':(3,2,1),
    'landsat-7':(3,2,1),
    'landsat-5':(2,1,0),
}

RESOLUTION = {
    'sentinel-2':10,
    'landsat-8':15,
    'landsat-7':15,
    'landsat-5':30,
}

def geom84_from_id(_id):
    zone, row, bbox_size_x, xloc, yloc = _id.split("_")
    bbox_size_x, xloc, yloc = int(bbox_size_x), int(xloc), int(yloc)
    bbox_size_y = bbox_size_x
    min_x = xloc * bbox_size_x
    min_y = yloc * bbox_size_y
    max_x = min_x + bbox_size_x
    max_y = min_y + bbox_size_y
    south = row < "N"
    crs_utm = pyproj.CRS.from_dict({"proj": "utm", "zone": zone, "south": south})
    crs_84 = pyproj.CRS('epsg:4326')
    geom_utm = geometry.box(min_x, min_y, max_x, max_y)
    
    transform_utm2ll = pyproj.Transformer.from_crs(crs_utm, crs_84, always_xy=True).transform

    return transform(transform_utm2ll, geom_utm)

def get_timestamps(storage_root, tile, constellation):
    
    return zarr.open(
        gcsfs.GCSMap(
            os.path.join(
                storage_root,
                tile,
                constellation,
                'timestamps'
            )
        ),'r')[:]

def save_thumbnail(data, constellation, path):
    
    im = Image.fromarray(((data[:,:,VIS_BANDS[constellation]]*1.4).clip(0,1)*255).astype(np.uint8))
    im.save(path)
    
    return 1

def save_metadata(r, constellation, path):
    
    geom_84 = geom84_from_id(r["tile"])
    
    dd = {
        "spacecraft_id":constellation,
        "datetime":r['datetime'].isoformat()[0:10],
        "tile":r["tile"],
        "tile_idx":r["tile_idx"],
        "scene_id":path.split('/')[-2],
        "location":[geom_84.centroid.x,geom_84.centroid.y],
        "resolution":RESOLUTION[constellation],
    }

    json.dump(dd, open(path,'w'))
    
    return 1

def transfer_data(storage_root,records, image_root, constellation):
    
    z_tiles = {tt:zarr.open(
        gcsfs.GCSMap(
            os.path.join(
                storage_root,
                tt,
                constellation,
                'data'
            )
        ),'r') for tt in list(set([r['tile'] for r in records]))}
    
    for r in tqdm(records):
        
        fname = '-'.join([str(r['idx']), r['tile'], str(r['tile_idx']), r['datetime'].isoformat()[0:10]])
        
        # get data
        data = z_tiles[r['tile']][r['tile_idx'],:,:,:].transpose(1,2,0)

        
        # norm data
        if not isinstance(NORM_CONSTELLATION[constellation],dict):
            data = data/NORM_CONSTELLATION[constellation]
        else:
            for kk, vv in NORM_CONSTELLATION[constellation].items():
                data[:,:,kk] = data[:,:,kk]/vv
        
        os.makedirs(os.path.join(image_root,fname))
        
        np.save(
            os.path.join(image_root,fname,f'{constellation}.npy'),
            data
        )
        
        save_thumbnail(
            data,
            constellation,
            os.path.join(image_root,fname,'thumbnail.png'),
        )
        
        save_metadata(
            r,
            constellation,
            os.path.join(image_root,fname,'metadata.json'),
        )
        
        
        
    return 1

def _random_sample(storage_root, image_root,constellation, tiles, N):
    
    # collect all timestamps
    all_timestamps = {tt:pd.to_datetime(get_timestamps(storage_root,tt,constellation)).date for tt in tiles}
    
    all_records = list(chain([{'tile':tt,'tile_idx':i_dt, 'datetime':dt} for tt,vv in all_timestamps.items() for i_dt, dt in enumerate(vv)])) 
    
    sample_records = sample(all_records, N)
    
    chosen_records = []
    for idx, r in enumerate(sample_records):
        r['idx']=idx
        chosen_records.append(r)
    
    transfer_data(storage_root,chosen_records, image_root, constellation)
        
    return 1

    
def _random_sample_in_tiles(storage_root, image_root,constellation, tiles, N):
        
    # collect all timestamps
    all_timestamps = {tt:pd.to_datetime(get_timestamps(tile,constellation,storage_root)).date for tt in tiles}
    
    tile_records = {tt:[{'tile':tt,'tile_idx':i_dt, 'datetime':dt} for i_dt, dt in enumerate(vv)] for tt,vv in all_timestamps.items()} 
    
    chosen_tile_records = {tt:sample(records, N) for tt,records in tile_records.items()}
    
    chosen_records = []
    ii=0
    for tt,records in chosen_tile_records.items():
        for record in records:
            record['idx'] = ii
            chosen_records.append(record)
            ii+=1
    
    transfer_data(storage_root,chosen_records, image_root, constellation)
        
    return 1
    
