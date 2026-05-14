/* eslint-disable prettier/prettier */

export const CUSTOMER_FILTER_SCHEMA = {

  customerID: {
    column: 'cs.adminID',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
  },

  adminID: {
    column: 'cs.adminID',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
  },

  name: {
    column: 'cs.name',
    type: 'text',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },

  userName: {
    column: 'cs.user_name',
    type: 'text',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },

  email: {
    column: 'cs.email',
    type: 'text',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },

  roleName: {
    column: 'cs.role',
    type: 'select',
    operators: ['equals', 'isEmpty', 'is_not_empty'],
  },

  mobile_no: {
    column: 'cs.mobile_number',
    type: 'text',
    operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },

  beneficiaryCount: {
    column: 'cs.beneficiary_count',
    type: 'number',
    operators: ['equals', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'is_not_empty'],
  },

  created_by: {
    column: 'creator.name',
    type: 'text',
    operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },

  modified_by: {
    column: 'modifier.name',
    type: 'text',
    operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
  },

  created_date: {
    column: 'cs.created_date',
    type: 'date',
    operators: ['equals', 'before', 'after'],
  },

  modified_date: {
    column: 'cs.modified_date',
    type: 'date',
    operators: ['equals', 'before', 'after'],
  },

  lastLogin: {
    column: 'cs.lastLogin',
    type: 'date',
    operators: ['equals', 'before', 'after'],
  },

  status: {
    column: 'cs.status',
    type: 'select',
    operators: ['equals','not_equals'],
  },
};
