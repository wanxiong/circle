import { default as FieldModel } from "./model/Field"

export interface Rule {
    validateType: "required";
    message: string;
}

export interface RequiredRule extends Rule {
    // 星星
    required: boolean;
}

export interface Field {
    name: string,
    fieldModel:  FieldModel;
}

export interface Value {
    initValue?: any;
    // 多个规则
    errorFields: Record<string, {
        fieldName: string;
        error: boolean;
        message: string [];
    }>;
    // 校验是否激活过
    triggered: boolean
}

export interface ListItem {
    label: string,
    id: string | number,
    fields: Field []
} 


export type IList = ListItem []


 