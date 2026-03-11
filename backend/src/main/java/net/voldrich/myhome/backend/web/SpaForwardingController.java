package net.voldrich.myhome.backend.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaForwardingController {

    @RequestMapping(value = "{path:[^.]*}")
    public String forward() {
        return "forward:/index.html";
    }
}
