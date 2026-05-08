/* eslint-disable prettier/prettier */


export const BENEFICIARY_FILTER_SCHEMA = {

    beneficiary_id: {
        column: 'bf.beneficiary_id',
        type: 'number',
        operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
    },

    district: {
        column: 'tr.district',
        type: 'number',
        operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
    },

    // training_site: {
    //     column: 'bf.training_site',
    //     type: 'select',
    //     operators: ['equals', 'isEmpty', 'is_not_empty'],
    // },

    training_site: {
        column: 'tr.training_site',
        type: 'select',
        operators: ['equals', 'isEmpty', 'is_not_empty'],
    },

    first_name: {
        column: 'bf.first_name',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    last_name: {
        column: 'bf.last_name',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    mobile_no: {
        column: 'bf.mobile_no',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    females_below_18: {
        column: 'bf.females_below_18',
        type: 'number',
        operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
    },

    females_above_18: {
        column: 'bf.females_above_18',
        type: 'number',
        operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
    },

    males_below_18: {
        column: 'bf.males_below_18',
        type: 'number',
        operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
    },

    males_above_18: {
        column: 'bf.males_above_18',
        type: 'number',
        operators: ['equals', 'gt', 'gte', 'lt', 'lte'],
    },

    national_id: {
        column: 'bf.national_id',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    device_serial_no: {
        column: 'bf.device_serial_no',
        type: 'text',
        operators: ['equals', 'contains', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    language: {
        column: 'bf.language',
        type: 'select',
        operators: ['equals', 'not_equals', 'Empty', 'Not Empty'],
    },

    cooking_method: {
        column: 'bf.cooking_method',
        type: 'select',
        operators: ['equals', 'not_equals', 'isEmpty', 'is_not_empty'],
    },

    other_cookstove: {
        column: 'bf.other_cookstove',
        type: 'select',
        operators: ['equals', 'not_equals'],
    },

    read_doc: {
        column: 'bf.read_doc',
        type: 'select',
        operators: ['equals', 'not_equals'],
    },

    understood_doc: {
        column: 'bf.understood_doc',
        type: 'select',
        operators: ['equals', 'not_equals'],
    },

    read_to_you: {
        column: 'bf.read_to_you',
        type: 'select',
        operators: ['equals', 'not_equals'],
    },

    stove_status_delivery: {
        column: 'bf.stove_status_delivery',
        type: 'select',
        operators: ['equals', 'not_equals'],
    },

    no_other_cook_stove_present: {
        column: 'bf.no_other_cook_stove_present',
        type: 'select',
        operators: ['equals', 'not_equals'],
    },

    primary_residence_confirmation: {
        column: 'bf.primary_residence_confirmation',
        type: 'select',
        operators: ['equals', 'not_equals'],
    },

    // created_by: {
    //     column: 'bf.created_by',
    //     type: 'text',
    //     operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    // },

    created_by: {
        column: 'a.name',
        type: 'text',
        operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    // modified_by: {
    //     column: 'bf.modified_by',
    //     type: 'text',
    //     operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    // },


    modified_by: {
        column: 'a2.name',
        type: 'text',
        operators: ['contains', 'equals', 'starts_with', 'ends_with', 'isEmpty', 'is_not_empty'],
    },

    created_date: {
        column: 'bf.created_date',
        type: 'date',
        operators: ['equals', 'before', 'after'],
    },

    modified_date: {
        column: 'bf.modified_date',
        type: 'date',
        operators: ['equals', 'before', 'after'],
    },

};
