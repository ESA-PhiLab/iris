from typing import List, Optional
import os, yaml, json

from oxeobin.sampling import _random_sample, _random_sample_in_tiles

# build config json
# populate project images

# band list doesn't matter... can save as npy
# scale all bands to [0:1]


class ProjectBuilder:
    
    def __init__(
        self,
        constellation: str,
        tiles: List[str],
        name: str,
        n_samples: int,
        storage_root: str,
        port: int = 8000,
        sampling: str = 'random',
        projects_root: str = os.path.join(os.getcwd(),'projects'),
        cfg: Optional[str] = None,
    ):
        
        assert sampling in ['random','random_in_tiles'], "'sampling' must be one of [random, random_in_tiles]"
        
        self.constellation = constellation
        self.tiles = tiles
        self.projects_root = projects_root
        self.sampling=sampling
        self.n_samples = n_samples
        self.storage_root = storage_root
        if cfg is None:
            self.cfg = yaml.load(open(os.path.join(os.getcwd(),'oxeobin','default_cfg',f'{constellation}.yaml'),'r'), Loader=yaml.SafeLoader)
            self.cfg['name'] = f'{name}-{constellation}'
        else:
            self.cfg = yaml.load(open(cfg),Loader=yaml.SafeLoader)
            
        
    def build(
        self,
    ):
        
        # build directories
        self._build_directories()
        
        # populate imagery
        if self.sampling == 'random':
            _random_sample(
                storage_root = self.storage_root,
                image_root = os.path.join(self.projects_root,self.cfg['name'],'images'),
                constellation=self.constellation, 
                tiles=self.tiles, 
                N=self.n_samples
            )
            
        elif self.sampling == 'random_in_tiles':
            _random_sample_within_tiles(
                storage_root = self.storage_root,
                image_root = os.path.join(self.projects_root,self.cfg['name'],'images'),
                constellation=self.constellation, 
                tiles=self.tiles, 
                N=self.n_samples
            )
        
    def _build_directories(self):
        
        # build the root and images directory
        #os.makedirs(os.path.join(self.projects_root,self.cfg['name']))
        if not os.path.exists(os.path.join(self.projects_root,self.cfg['name'],'images')):
            os.makedirs(os.path.join(self.projects_root,self.cfg['name'],'images'))
        
        # copy in the cfg
        json.dump(self.cfg, open(os.path.join(self.projects_root,self.cfg['name'],self.cfg['name']+'.json'),'w'))

if __name__=="__main__":
    
    ProjectBuilder(
        constellation='sentinel-2',
        tiles=["18_L_10000_24_895","18_L_10000_25_891"],
        name='test',
        n_samples=10,
        storage_root='gs://oxeo-water/prod',
    ).build()