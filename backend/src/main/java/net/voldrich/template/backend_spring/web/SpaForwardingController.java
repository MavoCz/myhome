package net.voldrich.template.backend_spring.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaForwardingController {

    @RequestMapping(value = "/{path:[^\\.]*}")
    public String forward() {
        return "forward:/index.html";
    }

    @RequestMapping(value = "/{path:[^\\.]*}/**")
    public String forwardNested() {
        return "forward:/index.html";
    }
}
