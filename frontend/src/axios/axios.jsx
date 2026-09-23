import axios from "axios";
import { base_url } from "../Api/config";

const api = axios.create({
    baseURL: base_url,

})

export default api;
