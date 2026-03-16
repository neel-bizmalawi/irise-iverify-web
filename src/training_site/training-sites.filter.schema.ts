/* eslint-disable prettier/prettier */
export const TRAINING_SITES_FILTER_SCHEMA = {

  training_point_id: {
    column: 'ts.training_point_id',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
  },

  // created_by: {
  //   column: 'ts.created_by',
  //   type: 'text',
  //   operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  // },

  created_by: {
  column: 'a.name',
  type: 'text',
  operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
},

  // modified_by: {
  //   column: 'ts.modified_by',
  //   type: 'text',
  //   operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  // },

    modified_by: {
    column: 'a2.name',
    type: 'text',
    operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },

  training_site: {
    column: 'ts.training_site',
    type: 'text',
    operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },

  district: {
    column: 'ts.district',
    type: 'text',
    operators: ['equals', 'contains', 'isEmpty', 'is_not_empty', 'starts_with', 'ends_with'],
  },

  traditional_authority: {
    column: 'ts.traditional_authority',
    type: 'text',
    operators: ['equals', 'contains', 'isEmpty', 'is_not_empty', 'starts_with', 'ends_with'],
  },

  village_head_name: {
    column: 'ts.village_head_name',
    type: 'text',
    operators: ['equals', 'contains', 'isEmpty', 'is_not_empty', 'starts_with', 'ends_with'],
  },

  gvh_name: {
    column: 'ts.gvh_name',
    type: 'text',
    operators: ['equals', 'contains', 'isEmpty', 'is_not_empty', 'starts_with', 'ends_with'],
  },

  training_status: {
    column: 'ts.training_status',
    type: 'select',
    operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
  },

  road_access: {
    column: 'ts.road_access',
    type: 'select',
    operators: ['equals','not_equals', 'isEmpty', 'is_not_empty'],
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

  modified_date: {
    column: 'ts.modified_date',
    type: 'date',
    operators: ['equals', 'before', 'after'],
  },

};