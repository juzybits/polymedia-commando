#!/usr/bin/env node

import dotenv from "dotenv";
import { Zui } from "./Zui.js";

dotenv.config();

const zui = new Zui();
void zui.run();
