import {simulate} from './swissSimulator.js';
self.onmessage=({data})=>{
  try{self.postMessage({results:data.map(config=>simulate(config))});}
  catch{self.postMessage({error:true});}
};
