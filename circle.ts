interface Idata {
    weight: number | null | undefined;
    source: string;
    target: string;
    isBreak?: boolean;
    [p: string]: any;
}

interface IGraph {
    [p: string]: number;
}

interface ICycleInfo {
    cycleArr: any[];
    allPath: any[];
    conflictNodesMap: Record<string, Record<string, any>>;
}

export class Circle {
    //邻接矩阵
    graph: Record<string, IGraph> = {};
    //标记矩阵,0为当前结点未访问,1为访问过,-1表示当前结点后边的结点都被访问过。
    visited: Record<string, number> = {};
    // 存储所有节点的数组
    nodes: string[] = [];
    // 数据源
    edges: Idata[] = [];
    //是否是DAG(有向无环图)
    isDAG = true;
    // 所有距离
    allPath: string[][] = [];
    // 冲突点 ||  多个入度的边
    inEdges: Record<string, Idata[]> = {};
    // 多个出边
    outEdges: Record<string, Idata[]> = {};
    constructor(data: Idata[]) {
        // 收集所有的节点
        this.depEdges(data);
        this.edges = data;
        this.createGraph(this.nodes, this.edges);
    }

    dupRemove(data: Idata[]) {
        const newData = data.reduce(
            (pre, cur) => {
                let isMerge = true;
                pre.forEach(item => {
                    if (item.source === cur.source && item.target === cur.target) {
                        isMerge = false;
                    }
                });
                if (isMerge) {
                    pre.push(cur);
                }
                return pre;
            },
            [data[0]]
        );

        return newData;
    }

    // 初始化数据结构
    depEdges(data: Idata[]) {
        if (Object.prototype.toString.call(data) !== '[object Array]')
            throw new Error('data is not array');
        const map: any = {};
        const outMap: any = {};
        data.forEach((item: Idata) => {
            const { source, target } = item;
            // 所有入度记录下来
            map[target] = map[target] ? map[target] : [];
            map[target].push(item);
            // 所有出度记下来
            outMap[source] = outMap[source] ? outMap[source] : [];
            outMap[source].push(item);

            if (!this.nodes.includes(source)) {
                this.nodes.push(source);
            }
            if (!this.nodes.includes(target)) {
                this.nodes.push(target);
            }
        });
        // 删除入读1的节点
        for (const attr in map) {
            // 可能重复 需要去重
            map[attr] = this.dupRemove(map[attr]);
        }
        // 删除出度读1的节点
        for (const attr in outMap) {
            // if (outMap[attr].length <= 1) {
            // delete outMap[attr]
            // } else {
            // 可能重复 需要去重
            outMap[attr] = this.dupRemove(outMap[attr]);
            // }
        }
        this.outEdges = outMap;
        this.inEdges = map;
    }
    // 是否是尾节点 既没有出度
    isLastNode(node: string) {
        const graphNode = this.graph[node];
        if (graphNode) {
            // 当前节点对应的图谱存在
            const nextNode = Object.values(graphNode).some(v => {
                return v === 1;
            });
            return !nextNode;
        }
        return;
    }
    // 获取当前的路径
    getPath() {
        return this.allPath;
    }

    dfs(i: number, arr: Idata[], pathArr: string[]) {
        // 是尾节点就结束了 && 环不收集 所有有环需要在另一个地方收集
        if (this.isLastNode(this.nodes[i])) {
            this.allPath.push(pathArr.slice(0));
            return;
        }
        //结点i变为访问过的状态
        this.visited[this.nodes[i]] = this.visited[this.nodes[i]] + 1;
        for (let j = 0; j < this.nodes.length; j++) {
            //如果当前结点有指向的结点
            const nowNodes = this.nodes[j];
            if (this.graph[this.nodes[i]][nowNodes] != 0) {
                //并且已经被访问过
                if (this.visited[nowNodes] == 1) {
                    this.isDAG = false; //有环
                    // 收集当前节点
                    const index = this.edges.findIndex(item => {
                        return item.source === this.nodes[i] && item.target === nowNodes;
                    });
                    // console.log('环点' + nowNodes, this.edges[index]);
                    // 可能存在重读收集  需要去重
                    if (arr) {
                        const hasNodes = arr.some((item: Idata) => {
                            return item.source === this.nodes[i] && item.target === nowNodes;
                        });
                        // 不存在收集
                        if (!hasNodes) arr.push(this.edges[index]);
                    }
                    this.allPath.push(pathArr.slice(0));
                    // break;
                } else if (this.visited[nowNodes] == -1) {
                    //当前结点后边的结点都被访问过，直接跳至下一个结点
                    continue;
                } else {
                    pathArr.push(nowNodes);
                    this.dfs(j, arr, pathArr); //否则递归访问
                    // 出站当前节点初始化为未访问
                    this.visited[nowNodes] = 0;
                    // 出站执行删除操作
                    pathArr.splice(
                        pathArr.findIndex((item: string) => {
                            return item === nowNodes;
                        }),
                        1
                    );
                }
            }
        }
        // 如果当前节点有多个入读 可能就会走这里 导致路径收集失败 需要判断当前路径标记是否等于入读的条数
        // if (this.inEdges[this.nodes[i]] && this.inEdges[this.nodes[i]].length > this.visited[this.nodes[i]]) {
        //   console.log('存在多个出度的节点', this.nodes[i]);
        //   return;
        // }
        this.visited[this.nodes[i]] = -1;
    }
    //创建图,以邻接矩阵表示
    createGraph(nodes: string[], edges: Idata[]) {
        // 生成矩阵
        for (let i = 0; i < nodes.length; i++) {
            const pre = nodes[i];
            this.graph[pre] = {};
            for (let j = 0; j < nodes.length; j++) {
                const next = nodes[j];
                //0 当前没有出度的节点
                this.graph[pre][next] = 0;
            }
        }
        // console.log('初始化矩阵');
        // console.table(this.graph)
        // 初始化出度
        for (let k = 0; k < edges.length; k++) {
            const edge = edges[k];
            // 1 当前有出度的节点
            this.graph[edge.source][edge.target] = 1;
        }

        //初始化节点数组为0，表示一开始所有顶点都未被访问过
        for (let i = 0; i < nodes.length; i++) {
            this.visited[nodes[i]] = 0;
        }
        // console.table(this.graph);
    }
    // 根据路径生成多个入读权重的map
    weightNodesMap() {
        const allPath = this.getPath();
        // 筛选出多个入读的节点（在当前的查找节点上）
        const inEdges = this.inEdges;
        const mulInEdges: Record<string, Idata[]> = {};
        // 权重ma
        const wMap: Record<string, Record<string, Idata>> = {};
        // 多个入读的节点收集起来
        for (const node in inEdges) {
            if (inEdges[node].length > 1) {
                mulInEdges[node] = inEdges[node];
            }
        }
        // 平铺二维数组
        const flatPath: string[] = Array.from(new Set(allPath.flat()));
        // 删除不在当前路径上的节点
        Object.keys(mulInEdges).forEach((nodekey: string) => {
            if (!flatPath.includes(nodekey)) {
                delete mulInEdges[nodekey];
                return;
            } else {
                // 删除当前节点入度不在当前路径上的
                const arrInEdges = mulInEdges[nodekey].filter(item => {
                    return flatPath.includes(item.source);
                });
                mulInEdges[nodekey] = arrInEdges;
            }
            // 在过滤当前路径下单个入读的节点
            if (mulInEdges[nodekey].length <= 1) {
                delete mulInEdges[nodekey];
            }
        });
        // 在根据权重字段算哪些路径在有交叉点的时候 不需要执行了  A => B => C => D     A => E > C
        Object.keys(mulInEdges).forEach(nodekey => {
            const valueArr = mulInEdges[nodekey];
            const maxW = this.maxWeight(valueArr);
            wMap[nodekey] = {};
            valueArr.forEach(item => {
                const { source, target, weight } = item;
                wMap[nodekey][source] = {
                    ...item,
                    isBreak: false
                };
                if (Number(weight || 0) !== maxW) {
                    wMap[nodekey][source] = {
                        ...item,
                        isBreak: true
                    };
                }
            });
        });
        // console.log(wMap, '冲突点map')
        return wMap;
    }
    /* 获取最大权重的数字
     *
     */
    maxWeight(nodes: Idata[]) {
        let max = 0;
        nodes.forEach((item: Idata) => {
            (item.weight || 0) > max ? (max = Number(item.weight || 0)) : null;
        });
        return max;
    }
    /** 是否有环
     * @param { arr } Array
     * @return { arr | boolean }
     * */
    hasCycle(arr: Idata[]) {
        //保证每个节点都遍历到，排除有的结点没有边的情况
        this.resetData();
        for (let i = 0; i < this.nodes.length; i++) {
            //该结点后边的结点都被访问过了，跳过它
            if (this.visited[this.nodes[i]] == -1) {
                continue;
            }
            const pathArr: string[] = [this.nodes[i]];
            this.dfs(i, arr, pathArr);
            if (!this.isDAG && !arr) {
                // console.log('有环');
                // 碰到环退出
                break;
            }
        }
        if (arr) {
            return arr;
        }
        return !this.isDAG;
    }
    /** 得到当前数据存在有向环的所有节点
     * return array
     * */
    findAllCycle() {
        const arr: Idata[] = [];
        this.hasCycle(arr);
        return arr;
    }
    /** 得到指定数据存在有向环的所有节点
     * return array
     * */
    findCycle(id: string): ICycleInfo {
        const arr: Idata[] = [];
        const defaultResult: ICycleInfo = {
            cycleArr: [],
            allPath: [],
            conflictNodesMap: {}
        };
        this.resetData();
        // 如果当前出度没有的话，就结束查找了
        if (!this.outEdges[id] || this.outEdges[id].length < 1) {
            return defaultResult;
        }
        // 找到对应的下标
        const index = this.nodes.findIndex(node => {
            return node === id;
        });
        const pathArr = [id];
        if (index !== -1) {
            this.dfs(index, arr, pathArr);
        } else {
            return defaultResult;
        }
        return {
            // 指定节点有向环的节点数组
            cycleArr: arr,
            // 指定节点有向环的所有路径数组
            allPath: this.getPath(),
            // 指定节点有向环的所有权重路径对比之后，多个入读的节点可受控字段 既 A 是否可以改变 B|C
            conflictNodesMap: this.weightNodesMap()
        };
    }

    resetData() {
        this.allPath = [];
        this.isDAG = true;
        this.createGraph(this.nodes, this.edges);
    }

    resetInit(data: Idata[]) {
        // 收集所有的节点
        this.resetData();
        this.depEdges(data);
        this.edges = data;
        // 创建邻接矩阵
        this.createGraph(this.nodes, this.edges);
    }
}
