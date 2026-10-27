package net.voldrich.myhome.backend.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves the kids' learning app (web-learning/) built into its own classpath folder,
 * so the main SPA build that empties static/ never removes it.
 */
@Configuration
public class LearningResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/learning/**")
                .addResourceLocations("classpath:/learning-static/");
    }
}
