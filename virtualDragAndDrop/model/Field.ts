import _ from "loadsh"
import  { BaseObservable } from "./BaseObservable";
import { Rule, RequiredRule } from "../interface"

type State = Record<string, any>

type FieldProps = {
    rules?: RequiredRule[]
    parentId: string | number;
    initValue: any
}

export default class Field extends BaseObservable<State> {

    validators: Rule [] = [];
    // 是否触发校验
    triggered: boolean = false;
    // 
    errorMessage: string [] = []

    parentId: string | number = ''

    constructor (state: FieldProps) {
        super(state.initValue || {});
        this.initValidators(state.rules)
        this.parentId = state.parentId
    }

    protected initValidators (rules: State["rules"]): void {
        this.validators = [...rules]
    }

    validate () {
        console.log("validate")
        if (this.validators.length === 0) return;
        this.triggered = true;
        const errorMessage: string [] = [];
        this.validators.forEach((validator) => {
            const validateType = validator.validateType;
            const message = validator.message;
            if (validateType === "required") {
                this.validateRequired(errorMessage, message)
            }
        });
        const isEqual = _.isEqual(this.errorMessage, errorMessage);
        if (!isEqual) {
            this.errorMessage = errorMessage;
            this.publish(this.state, this.state)
        }
        return errorMessage
    }
    validateRequired (errorList: string [], errorMessage: string) {
        const value = this.state?.value
        if (!value && value !== 0) {
            errorList.push(errorMessage)
        }
    }

    onValueChange (value: any): void {
      this.setState(value)
      if (this.triggered) {
        this.validate()
      }
    }

    getValue() {
        return this.state;
    }

    destroy(quiet = false): void {
        // 清空一下值
        this.setState({});
        super.destroy();
    }
}