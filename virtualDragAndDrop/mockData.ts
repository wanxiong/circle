import { ListItem } from "./interface";
import Field from "./model/Field"

function initData () {
    const list: ListItem [] = [];
    for (let i = 0; i < 50; i++) {
        const v: ListItem = {
        label: 'test -' + i,
        id: i,
        fields: [{
            name: "textarea",
            fieldModel: new Field({
                initValue: {},
                parentId: i,
                rules: [{
                    required: true,
                    validateType: "required",
                    message: 'Please textarea your name',
                }]
            })
        }, {
            name: "input",
            fieldModel: new Field({
                initValue: {},
                parentId: i,
                rules: [{
                    required: true,
                    validateType: "required",
                    message: 'Please input your name',
                }]
            }),
        }]
        }

        list.push(v);
    }
    return list;
}

const mockList = initData()

export default mockList