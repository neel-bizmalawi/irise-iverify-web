export const TRAINING_SITES_FILTER_SCHEMA = {
  training_site: {
    column: 'ts.training_site',
    type: 'text',
    operators: ['contains', 'equals', 'starts_with', 'ends_with'],
  },

  district: {
    column: 'ts.district',
    type: 'text',
    operators: ['equals', 'contains'],
  },

  traditional_authority: {
    column: 'ts.traditional_authority',
    type: 'text',
    operators: ['equals', 'contains'],
  },

  village_head_name: {
    column: 'ts.village_head_name',
    type: 'text',
    operators: ['equals', 'contains'],
  },

  gvh_name: {
    column: 'ts.gvh_name',
    type: 'text',
    operators: ['equals', 'contains'],
  },

  training_status: {
    column: 'ts.training_status',
    type: 'select',
    operators: ['equals', 'not_equals'],
  },

  road_access: {
    column: 'ts.road_access',
    type: 'select',
    operators: ['equals'],
  },

  is_parent: {
    column: 'ts.is_parent',
    type: 'select',
    operators: ['equals'],
  },

  status: {
    column: 'ts.status',
    type: 'select',
    operators: ['equals'],
  },

  total_people: {
    column: 'ts.total_people',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
  },

  house_holds_count: {
    column: 'ts.house_holds_count',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
  },

  cookstoves_count: {
    column: 'ts.cookstoves_count',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
  },

  house_hold_radius: {
    column: 'ts.house_hold_radius',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
  },

  created_date: {
    column: 'ts.created_date',
    type: 'date',
    operators: ['equals', 'before', 'after'],
  },
};