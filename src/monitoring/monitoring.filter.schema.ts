/* eslint-disable prettier/prettier */


export const MONITORING_FILTER_SCHEMA =
{

    national_id: {
        column: 'md.national_id',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    agent_name: {
        column: 'md.agent_name',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    device_serial_no: {
        column: 'md.device_serial_no',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    new_device_serial_no: {
        column: 'md.new_device_serial_no',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    hh_name_same: {
        column: 'md.hh_name_same',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    stoves_present: {
        column: 'md.stoves_present',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    stove_being_used: {
        column: 'md.stove_being_used',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    stove_condition: {
        column: 'md.stove_condition',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    user_satisfaction: {
        column: 'md.user_satisfaction',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    fuel_type: {
        column: 'md.fuel_type',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    needs_training: {
        column: 'md.needs_training',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    needs_more_visits: {
        column: 'md.needs_more_visits',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    health_hospital_less: {
        column: 'md.health_hospital_less',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    health_better_air: {
        column: 'md.health_better_air',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    // created_by: {
    //     column: 'md.created_by',
    //     type: 'text',
    //     operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    // },

     created_by: {
        column: 'a.name',
        type: 'text',
        operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    // modified_by: {
    //     column: 'md.modified_by',
    //     type: 'text',
    //     operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    // },
      modified_by: {
        column: 'a2.name',
        type: 'text',
        operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    visit_at: {
        column: 'md.visit_at',
        type: 'date',
        operators: ['equals', 'before', 'after'],
    },

    created_date: {
        column: 'md.created_date',
        type: 'date',
        operators: ['equals', 'before', 'after'],
    },

    modified_at: {
        column: 'md.modified_at',
        type: 'date',
        operators: ['equals', 'before', 'after'],
    },

};