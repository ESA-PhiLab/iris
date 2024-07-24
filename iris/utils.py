from copy import deepcopy

import flask
import markupsafe


class View:
    def __init__(self, name, description, loader):
        self.name = name
        self.description = description
        self.loader = loader

    def to_json(self):
        return {
            'name': markupsafe.Markup(self.name),
            'description': markupsafe.Markup(self.description),
        }

def merge_deep_dicts(d1, d2):
    merged = deepcopy(d1)
    for k, v in d2.items():
        if k not in merged or not isinstance(v, dict):
            merged[k] = v
        else:
            merged[k] = merge_deep_dicts(merged[k], v)
    return merged
