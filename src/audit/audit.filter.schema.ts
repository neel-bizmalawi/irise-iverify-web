/* eslint-disable prettier/prettier */
export const AUDIT_FILTER_SCHEMA = {
 
  household_name: {
    column: "af.household_name",
    type: "text",
    operators: ["equals", "contains", "starts_with", "ends_with", "isEmpty", "is_not_empty"],
  },
 
  national_id: {
    column: "af.national_id",
    type: "text",
    operators: ["equals", "contains", "starts_with", "ends_with", "isEmpty", "is_not_empty"],
  },
 
  phone_number: {
    column: "af.phone_number",
    type: "text",
    operators: ["equals", "contains", "starts_with", "ends_with", "isEmpty", "is_not_empty"],
  },
 
  where_received: {
    column: "af.where_received",
    type: "text",
    operators: ["equals", "contains", "starts_with", "ends_with"],
  },
 
  where_trained: {
    column: "af.where_trained",
    type: "text",
    operators: ["equals", "contains", "starts_with", "ends_with"],
  },
 
  females_below_18: {
    column: "af.females_below_18",
    type: "number",
    operators: ["equals", "gt", "gte", "lt", "lte"],
  },
 
  females_above_18: {
    column: "af.females_above_18",
    type: "number",
    operators: ["equals", "gt", "gte", "lt", "lte"],
  },
 
  males_below_18: {
    column: "af.males_below_18",
    type: "number",
    operators: ["equals", "gt", "gte", "lt", "lte"],
  },
 
  males_above_18: {
    column: "af.males_above_18",
    type: "number",
    operators: ["equals", "gt", "gte", "lt", "lte"],
  },
 
  has_cookstove_observe: {
    column: "af.has_cookstove_observe",
    type: "select",
    operators: ["equals", "not_equals"],
  },
 
  other_cooking_device_before: {
    column: "af.other_cooking_device_before",
    type: "select",
    operators: ["equals", "not_equals"],
  },
 
  payment_requested: {
    column: "af.payment_requested",
    type: "select",
    operators: ["equals", "not_equals"],
  },
 
  training_before_receiving: {
    column: "af.training_before_receiving",
    type: "select",
    operators: ["equals", "not_equals"],
  },
 
  rea_conset: {
    column: "af.read_conset",
    type: "select",
    operators: ["equals", "not_equals"],
  },
 
  sign_consent: {
    column: "af.sign_consent",
    type: "select",
    operators: ["equals", "not_equals"],
  },
 
  delivered_condition: {
    column: "af.delivered_condition",
    type: "select",
    operators: ["equals", "not_equals"],
  },
 
  s_is_sync: {
    column: "af.s_is_sync",
    type: "select",
    operators: ["equals", "not_equals"],
  },
 
  created_by: {
    column: "af.created_by",
    type: "text",
    operators: ["contains", "equals", "starts_with", "ends_with", "isEmpty", "is_not_empty"],
  },
 
  modified_by: {
    column: "af.modified_by",
    type: "text",
    operators: ["contains", "equals", "starts_with", "ends_with", "isEmpty", "is_not_empty"],
  },
 
  visit_date: {
    column: "af.visit_date",
    type: "date",
    operators: ["equals", "before", "after"],
  },
 
  created_date: {
    column: "af.created_date",
    type: "date",
    operators: ["equals", "before", "after"],
  },
 
  modified_date: {
    column: "af.modified_date",
    type: "date",
    operators: ["equals", "before", "after"],
  },
 
};