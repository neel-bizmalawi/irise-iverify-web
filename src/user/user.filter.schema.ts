/* eslint-disable prettier/prettier */

export const USER_FILTER_SCHEMA = {
 
  adminID: {
    column: 'us.adminID',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
  },
 
  name: {
    column: 'us.name',
    type: 'text',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },
 
  userName: {
    column: 'us.user_name',
    type: 'text',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },
 
  email: {
    column: 'us.email',
    type: 'text',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },
 
  roleName: {
    column: 'us.role',
    type: 'select',
    operators: ['equals', 'isEmpty', 'is_not_empty'],
  },
 
  mobile_no: {
    column: 'us.mobile_number',
    type: 'text',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },
 
  created_by: {
    column: 'us.created_by',
    type: 'text',
    operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },
 
  modified_by: {
    column: 'us.modified_by',
    type: 'text',
    operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },
 
  created_date: {
    column: 'us.created_date',
    type: 'date',
    operators: ['equals', 'before', 'after'],
  },
 
  modified_date: {
    column: 'us.modified_date',
    type: 'date',
    operators: ['equals', 'before', 'after'],
  },
 
  lastLogin: {
    column: 'us.lastLogin',
    type: 'date',
    operators: ['equals', 'before', 'after'],
  },
 
    status: {
    column: 'us.status',
    type: 'select',
    operators: ['equals','not_equals'],
  },
};