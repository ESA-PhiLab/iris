from iris.project import Project, project


def test_set_image_seed_and_order(project_snapshot):
    p = Project()
    p.image_ids = ["a", "b", "c", "d"]
    p.image_order = list(range(len(p.image_ids)))
    p.set_image_seed(0)
    # deterministic order: seed 0 should produce a list
    assert isinstance(p.image_order, list)
    # test get_start_image_id/get_previous_image
    project.image_ids = p.image_ids
    project.image_order = p.image_order
    project.set_image_seed(0)
    first = project.get_start_image_id()
    assert first in project.image_ids
    prev = project.get_previous_image(first)
    assert prev in project.image_ids
