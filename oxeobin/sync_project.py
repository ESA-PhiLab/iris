import os
import glob
import zarr
from zarr.errors import ArrayNotFoundError
import gcsfs
from tqdm import tqdm
import json
import numpy as np


def maybe_open_zarr(tile_id, constellation, storage_root, mask_name):
    
    mask_address = f'{storage_root}/{tile_id}/{constellation}/mask/{mask_name}'
    data_address = f'{storage_root}/{tile_id}/{constellation}/data'
    
    try:
        z_m = zarr.open_array(gcsfs.GCSMap(mask_address),'r+')
        
    except ArrayNotFoundError:
        z_data = zarr.open_array(gcsfs.GCSMap(data_address),'r')
        shp = (z_data.shape[0], z_data.shape[2], z_data.shape[3])
        chunks = (1, z_data.shape[2], z_data.shape[3])
        z_m = zarr.open_array(gcsfs.GCSMap(mask_address),shape=shp,chunks=chunks,dtype=np.uint8,mode='w-')
        
    except Exception as e:
        raise e
        
    return z_m

class SyncProject:
    
    def __init__(self, project_root, storage_root, mask_name):
        self.project_root = project_root
        self.storage_root = storage_root
        self.mask_name = mask_name
        
    def get_zarr_masks(self, tiles_constellations):
    
        z_m_dict = {}

        for tile_id, constellation in tiles_constellations:
            z_m_dict[(tile_id,constellation)] = maybe_open_zarr(tile_id, constellation, self.storage_root, self.mask_name)

        return z_m_dict
        
    def run(self):
        
        self.project_name = os.path.split(self.project_root)[-1]
        
        # collect_metas from /images
        image_paths = glob.glob(os.path.join(self.project_root,'images','*'))
        print ('image paths')
        print (image_paths)

        metadatas = {os.path.split(f)[-1]:json.load(open(os.path.join(f,'metadata.json'),'r')) for f in image_paths}

        tile_constellations = list(set([(vv["tile"],vv["spacecraft_id"]) for kk, vv in metadatas.items()]))

        # open zarrs
        zarr_masks = self.get_zarr_masks(tile_constellations)

        # for images
        not_synced = 0
        for image_id, metadata in tqdm(metadatas.items()):
            seg_fname = os.path.join(self.project_root,f'{self.project_name}.iris','segmentation',image_id,'2_final.npy')
            if os.path.exists(seg_fname):

                arr = np.load(seg_fname).argmax(axis=2).astype(np.uint8)

                zarr_masks[(metadata['tile'],metadata['spacecraft_id'])][metadata['tile_idx'],:,:] = arr
            else:
                not_synced+=1

        print (f'Not synced: {not_synced} / {len(metadatas.keys())}')

        return 1
            
            
            
    
    
    
    