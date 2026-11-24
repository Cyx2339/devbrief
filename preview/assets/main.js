import {createApp,h} from 'vue';
import Workbench from './Workbench.js';
const app=createApp(Workbench);
app.component('RouterLink',{props:['to'],setup(props,{slots}){return()=>h('a',{href:'https://pdsuwwz.github.io/chatgpt-vue3-light-mvp/',target:'_blank',rel:'noopener noreferrer'},slots.default?.())}});
app.mount('#app');
