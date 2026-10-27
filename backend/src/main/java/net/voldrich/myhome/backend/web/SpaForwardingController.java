package net.voldrich.myhome.backend.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaForwardingController {

    @RequestMapping(value = "{path:[^.]*}")
    public String forward() {
        return "forward:/index.html";
    }

    // Relative asset URLs of the learning app need the trailing slash
    @RequestMapping("/learning")
    public String learningRedirect() {
        return "redirect:/learning/";
    }

    @RequestMapping("/learning/")
    public String learning() {
        return "forward:/learning/index.html";
    }
}
