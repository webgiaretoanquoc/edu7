jQuery(document).ready(function($) {

    //support for the trim method in ie8
    if(typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, ''); 
        };
    }
    
    //fix select option double arrow issue with firefox mobile
    var is_firefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    var ua = navigator.userAgent.toLowerCase();
    var is_android = ua.indexOf("android") > -1;
    if(is_firefox && is_android){
        $('.dagt-container select').addClass('dagt-no-background-image');
    }
    
    //hide the ajax loader with ie and edge
    if( is_ie() || is_edge() ){
        $('.dagt-ajax-loader').addClass('dagt-ajax-loader-hide-ie-edge');
    }
    
    //apply chosen
    apply_chosen();
    
    //fix select option in wrong position in windows phones
    if(is_windows_phone()){
        $('.dagt-select-container').addClass('dagt-multiple-selection-windows-phone');
    }
    
    //make the container visible
    $(".dagt-container").css('visibility', 'visible');
    
    //adapt the input field if the browser is ie
    if(is_ie){
        $('.dagt-container input[type="text"]').addClass('dagt-auto-line-height');
    }

    //event listener on the "Check Answers" button
    $(".dagt-submit-form[data-type='check-answers']").click(dagt_check_answers);
    
    //event listener on the "Reset Test" button click
    $(".dagt-submit-form[data-type='reset-test']").click(dagt_reset_test);
    
    /*
     * Verifies the answers and updates the test
     */
    function dagt_check_answers(){
        
        /*
         * Remove the click event listener on the "Check Answers" button to
         * avoid multiple requests
         */
        $(this).off('click');
        
        //get the id of the submitted test
        var test_container = $(this).parent().parent();
        var test_id = parseInt(test_container.attr('data-test-id'), 10);
        var test_data = [];

        //retrieve the test data by analyzing the DOM
        test_data = get_test_data(test_id, test_container);

        //prepare ajax request
        var data = {
            "action": "dagt_analyze_test",
            "security": dagt_nonce,
            "test_id": test_id,
            "test_data": test_data
        };

        //show the ajax loader
        $('#dagt-container-' + test_id + ' .dagt-ajax-loader').css('visibility', 'visible');

        //send ajax request
        $.post(dagt_ajax_url, data, function(test_results) {
            
            //hide the ajax loader
            $('#dagt-container-' + test_id + ' .dagt-ajax-loader').css('visibility', 'hidden');
            
            /*
             * If the test is an examination hide the test and show a
             * message, if the test is not an examination correct the
             * results
             */
            if(test_results == 'examination-completed'){

                //hide the test
                $('#dagt-container-' + test_id).children().remove();
                $('#dagt-container-' + test_id).append('<div class="dagt-message-examination-completed" id="dagt-message-examination-completed-' + parseInt(test_id, 10) + '"></div>');
                $('#dagt-message-examination-completed-' + parseInt(test_id, 10)).text( $('#dagt-submitted-examination-text').val() );

            }else{
            
                var is_json = true;
                try{
                    $.parseJSON(test_results);
                }catch(e){
                    is_json = false;
                }

                if(is_json){

                    //init vars
                    var number_of_correct_answers = 0;
                    var total_number_of_answers = 0;

                    /*
                     * Remove the parentheses and their content from the sentences
                     * if the "Remove Parentheses" option is enabled
                     */
                    dagt_remove_parentheses(test_id);
                    
                    //convert the AJAX json answer to an array of objects
                    var data_obj = jQuery.parseJSON(test_results);
                    
                    //remove fix select option in wrong position in windows phones
                    if(is_windows_phone()){
                        $('.dagt-select-container').removeClass('dagt-multiple-selection-windows-phone');
                    }

                    //parse through all the objects in the array
                    $.each( data_obj, function( key, value ) {

                        //find the considered input by using a selector with multiple data attributes
                        var current_input = $('#dagt-container-' + test_id + ' [data-section-id="' + value.section_id + '"] [data-sentence-id="' + value.sentence_id + '"] [data-element-index="' + value.element_index + '"]');

                        /*
                         * Set the class that will be used to display with
                         * different colors the correct and the wrong answers
                         */
                        if(value.result == 'correct'){
                            var correct_wrong_class = 'dagt-correct-highlight';
                        }else{
                            var correct_wrong_class = 'dagt-wrong-highlight';
                        }

                        if(value.correct_answer.trim().length > 0){
                            
                            //In this case the correct answer is not empty
                            
                            if(value.explanation.trim().length > 0){
                                
                                /*
                                 * If the explanation is not empty add the title
                                 * attribute to enable the tooltip
                                 */
                                var correct_answer_textual = '<div class="dagt-correct-answer-textual dagt-explanation-enabled" title="' + value.explanation + '"> ' + value.correct_answer + '</div>';
                                
                            }else{
                                
                                /*
                                 * If the explanation is empty do not add the
                                 * title attribute for the tooltip
                                 */
                                var correct_answer_textual = '<div class="dagt-correct-answer-textual"> ' + value.correct_answer + '</div>';
                                
                            }
                            
                            current_input[0].outerHTML = '<div class="dagt-correct-answer ' + correct_wrong_class  + '">' + correct_answer_textual + '</div>';
                            
                        }else{
                            
                            //In this case the correct answer is empty
                            
                            if(value.explanation.trim().length > 0){
                                
                                /*
                                 * If the explanation is not empty add the
                                 * tooltip icon with the title attribute applied
                                 */
                                var explanation_dashicon = $('#dagt-explanation-dashicon').val();
                                var explanation_icon = '<span class="dashicons ' + explanation_dashicon + ' dagt-info-tooltip" title="' + value.explanation + '"></span>';
                                current_input[0].outerHTML = '<div class="dagt-correct-answer ' + correct_wrong_class  + '">' + explanation_icon + '</div>';
                                
                            }else{
                                
                                /*
                                 * If the explanation is empty do not add the
                                 * explanation tooltip
                                 */
                                current_input[0].outerHTML = '';
                                
                            }
                        }
                        
                        //increase the counter of the number of correct answers
                        if(value.result == 'correct'){ number_of_correct_answers = number_of_correct_answers + 1; }

                        //increase the counter of the total number of answers
                        total_number_of_answers = total_number_of_answers + 1;

                    });

                    /*
                     * Create an area with information about the results of the
                     * test at the beginning of the test
                     */
                    $('#dagt-container-' + test_id).prepend('<div class="dagt-general-answers" id="dagt-general-answers-' + parseInt(test_id, 10) + '"></div>');
                    $('#dagt-general-answers-' + parseInt(test_id, 10)).text( $('#dagt-evaluation-text-part-1').val() + ' ' + number_of_correct_answers + ' ' + $('#dagt-evaluation-text-part-2').val() + ' ' + total_number_of_answers + ' (' + parseInt(number_of_correct_answers / total_number_of_answers * 100, 10) + '%) ' + $('#dagt-evaluation-text-part-3').val());
                    if(parseInt($('#dagt-show-test-title').val(), 10) == 1){
                        $('#dagt-container-' + test_id).prepend('<h2 id="dagt-results-title-' + parseInt(test_id, 10) + '"></h2>');
                    }
                    $('#dagt-results-title-' + parseInt(test_id, 10)).text($('#dagt-results-title-text').val());

                    /*
                     * For each section add an area with information about the
                     * results of the test in that specific area
                     */
                    $("#dagt-container-" + test_id + " .dagt-section-container").each(function(index){

                       //get the identifier of the section
                       var section_id = parseInt($(this).attr('data-test-section-id'), 10);

                       //calculate the number of correct answers of this section
                       var correct_answer_per_section = get_correct_answers_per_section(section_id, data_obj);

                       //calculate the total number of answers of this section
                           var total_answers_per_section = get_total_answers_per_section(section_id, data_obj);

                       //add the area with the information at the beginning of the section
                       var section_id_attribute = $(this).attr('id');
                       if(total_answers_per_section == 0){
                           var section_percentage = 0;
                       }else{
                           var section_percentage = parseInt(correct_answer_per_section/total_answers_per_section*100, 10);
                       }
                       
                       $('#' + section_id_attribute + ' h3').after('<div class="dagt-section-result" id="dagt-section-result-' + parseInt(test_id, 10) + '-' + section_id + '"></div>');
                       $('#dagt-section-result-' + parseInt(test_id, 10) + '-' + section_id).text( $('#dagt-section-text-part-1').val() + ' ' + correct_answer_per_section + ' ' + $('#dagt-section-text-part-2').val() + ' ' + total_answers_per_section + ' (' + section_percentage + '%) ' + $('#dagt-section-text-part-3').val());

                    });

                    //remove the check answers
                    $("#dagt-container-" + test_id + " .dagt-submit-form[data-type='check-answers']").remove();
                    
                    //remove the elements generated by the chosen plugin
                    $("#dagt-container-" + test_id + " .chosen-container").remove();
                    
                    //show the reset test button
                    $("#dagt-container-" + test_id + " .dagt-submit-form[data-type='reset-test']").show();
                    
                    //remove the section descriptions
                    $("#dagt-container-" + test_id + " .dagt-section-description").remove();
                    
                    //remove the test title
                    $("#dagt-container-" + test_id + " .dagt-test-title").remove();
                    
                    //remove the test description
                    $("#dagt-container-" + test_id + " .dagt-test-description").remove();
                    
                    //init jquery-ui-tooltip
                    $(function() {
                        $( "#dagt-container-" + test_id + " .dagt-correct-answer-textual" ).tooltip({show: false, hide: false});
                        $( "#dagt-container-" + test_id + " .dagt-info-tooltip" ).tooltip({show: false, hide: false});
                    });

                    //scroll to the start of the test if the auto scroll option is enabled
                    if(parseInt($('#dagt-auto-scroll').val(), 10) == 1){

                        var scroll_time = parseInt( $('#dagt-test-scroll-time').val(), 10);
                        var scroll_easing = $('#dagt-scroll-easing').val();
                        var scroll_offset = parseInt( $('#dagt-test-scroll-offset').val(), 10);
                        
                        $('#dagt-container-' + test_id).animatescroll({
                            scrollSpeed: scroll_time,
                            easing: scroll_easing,
                            padding: scroll_offset
                        });

                    };
                    
                }

            }

        });
        
    }
    
    /*
     * Reset a test to its original status
     */
    function dagt_reset_test(){
        
        $(this).off('click');
        
        //get the id of the test
        var test_container = $(this).parent().parent();
        var test_id = parseInt(test_container.attr('data-test-id'), 10);

        //prepare ajax request
        var data = {
            "action": "dagt_get_test_html",
            "security": dagt_nonce,
            "test_id": test_id
        };

        //show the ajax loader
        $('#dagt-container-' + test_id + ' .dagt-ajax-loader').css('visibility', 'visible');

        //send ajax request
        $.post(dagt_ajax_url, data, function(test_html) {

            //show the ajax loader
            $('#dagt-container-' + test_id + ' .dagt-ajax-loader').css('visibility', 'hidden');

            if(test_html != 'error'){
                
                //replace #dagt-container-[test_id] with the new content
                $('#dagt-container-' + test_id).replaceWith(test_html);
                
                /*
                 * Re-apply the event listeners associated with:
                 * 
                 * - .dagt-submit-form[data-type='check-answers']
                 * - .dagt-submit-form[data-type='reset-test']
                 */
                $(".dagt-submit-form[data-type='check-answers']").click(dagt_check_answers);
                $(".dagt-submit-form[data-type='reset-test']").click(dagt_reset_test);
                
                //apply chosen
                apply_chosen();
                
                //fix select option in wrong position in windows phones
                if(is_windows_phone()){
                    $('.dagt-select-container').addClass('dagt-multiple-selection-windows-phone');
                }
                
                //make the container visible
                $(".dagt-container").css('visibility', 'visible');
                
            }
            
            //scroll to the start of the test if the auto scroll option is enabled
            if(parseInt($('#dagt-auto-scroll').val(), 10) == 1){

                var scroll_time = parseInt( $('#dagt-test-scroll-time').val(), 10);
                var scroll_easing = $('#dagt-scroll-easing').val();
                var scroll_offset = parseInt( $('#dagt-test-scroll-offset').val(), 10);

                $('#dagt-container-' + test_id).animatescroll({
                    scrollSpeed: scroll_time,
                    easing: scroll_easing,
                    padding: scroll_offset
                });

            };
            
        });
        
    }
    
    /*
     * Retrieve the test data by analying the DOM
     *  
     * @param test_id The id of the analyzed test
     * @param test_container the container of the analyzed test
     * @return array An array with included the fetched test data
     */
    function get_test_data(test_id, test_container){
        
        var fetched_data = [];
        
        //parse the 10 sections of the test
        $("#dagt-container-" + test_id + " .dagt-section-container .dagt-sentence-container").each(function(index){
            
            //generate the data for the missing words elements
            $(this).children("input").each(function(){
                
                var element_index = parseInt($(this).attr('data-element-index'), 10);
                var section_id = parseInt($(this).parent().parent().attr('data-section-id'), 10);
                var sentence_id = parseInt($(this).parent().attr('data-sentence-id'), 10);
                var type = "mw";
                var type_id = $(this).attr("data-mw-id");
                var value = $(this).val();
                
                fetched_data.push({
                    element_index: element_index,
                    section_id: section_id,
                    sentence_id: sentence_id,
                    type: type,
                    type_id: type_id,
                    value: value
                });
                
            });
            
            //generate the data for the multiple selections elements
            $(this).children(".dagt-select-container").each(function(){
                
                $(this).children("select").each(function(){

                    var element_index = parseInt($(this).attr('data-element-index'), 10);
                    var section_id = parseInt($(this).parent().parent().parent().attr('data-section-id'), 10);
                    var sentence_id = parseInt($(this).parent().parent().attr('data-sentence-id'), 10);
                    var type = "ms";
                    var type_id = $(this).attr("data-ms-id");
                    var value = $(this).val();

                    fetched_data.push({
                        element_index: element_index,
                        section_id: section_id,
                        sentence_id: sentence_id,
                        type: type,
                        type_id: type_id,
                        value: value
                    });

                });
                
            });    
            
        });
        
        return fetched_data;
        
    }
    
    /*
     * Get the number of correct answers of the specified section 
     *
     * @param section_id The id of the section for which the number of correct answers is needed
     * @param data_obj The data used to calculate the number of correct answer
     * @return int The number of correct answers of the specified section
     */
    function get_correct_answers_per_section(section_id, data_obj){

        var correct_answer_s1 = 0;
        var correct_answer_s2 = 0;
        var correct_answer_s3 = 0;
        var correct_answer_s4 = 0;
        var correct_answer_s5 = 0;
        var correct_answer_s6 = 0;
        var correct_answer_s7 = 0;
        var correct_answer_s8 = 0;
        var correct_answer_s9 = 0;
        var correct_answer_s10 = 0;
        
        $.each( data_obj, function( key, value ) {

            if(value.result == 'correct'){
                
                switch(value.test_section_id) {
                    case 1:
                        correct_answer_s1++;
                        break;
                    case 2:
                        correct_answer_s2++;
                        break;
                    case 3:
                        correct_answer_s3++;
                        break;
                    case 4:
                        correct_answer_s4++;
                        break;
                    case 5:
                        correct_answer_s5++;
                        break;
                    case 6:
                        correct_answer_s6++;
                        break;
                    case 7:
                        correct_answer_s7++;
                        break;
                    case 8:
                        correct_answer_s8++;
                        break;
                    case 9:
                        correct_answer_s9++;
                        break;
                    case 10:
                        correct_answer_s10++;
                        break;
                }
                
            }

        });
        
        switch(section_id) {
            case 1:
                return correct_answer_s1;
                break;
            case 2:
                return correct_answer_s2;
                break;
            case 3:
                return correct_answer_s3;
                break;
            case 4:
                return correct_answer_s4;
                break;
            case 5:
                return correct_answer_s5;
                break;
            case 6:
                return correct_answer_s6;
                break;
            case 7:
                return correct_answer_s7;
                break;
            case 8:
                return correct_answer_s8;
                break;
            case 9:
                return correct_answer_s9;
                break;
            case 10:
                return correct_answer_s10;
                break;
        }
        
    }
    
    /*
     * Get the total number of answers for the specified section
     * 
     * @param section_id The id of the section for which the total number of answers is needed
     * @param data_obj The data used to calculate the total number of answers
     * @return int The total number of answers of the specified section
     */
    function get_total_answers_per_section(section_id, data_obj){

        var total_answer_s1 = 0;
        var total_answer_s2 = 0;
        var total_answer_s3 = 0;
        var total_answer_s4 = 0;
        var total_answer_s5 = 0;
        var total_answer_s6 = 0;
        var total_answer_s7 = 0;
        var total_answer_s8 = 0;
        var total_answer_s9 = 0;
        var total_answer_s10 = 0;
        
        $.each( data_obj, function( key, value ) {

            switch(value.test_section_id) {
                case 1:
                    total_answer_s1++;
                    break;
                case 2:
                    total_answer_s2++;
                    break;
                case 3:
                    total_answer_s3++;
                    break;
                case 4:
                    total_answer_s4++;
                    break;
                case 5:
                    total_answer_s5++;
                    break;
                case 6:
                    total_answer_s6++;
                    break;
                case 7:
                    total_answer_s7++;
                    break;
                case 8:
                    total_answer_s8++;
                    break;
                case 9:
                    total_answer_s9++;
                    break;
                case 10:
                    total_answer_s10++;
                    break;
            }
                
        });
        
        switch(section_id) {
            case 1:
                return total_answer_s1;
                break;
            case 2:
                return total_answer_s2;
                break;
            case 3:
                return total_answer_s3;
                break;
            case 4:
                return total_answer_s4;
                break;
            case 5:
                return total_answer_s5;
                break;
            case 6:
                return total_answer_s6;
                break;
            case 7:
                return total_answer_s7;
                break;
            case 8:
                return total_answer_s8;
                break;
            case 9:
                return total_answer_s9;
                break;
            case 10:
                return total_answer_s10;
                break;
        }
        
    }
    
    /*
     * Remove the parentheses and their content from the sentences
     * if the "Remove Parentheses" option is enabled
     * 
     * @param test_id The test id
     * @return string The sentence with the parentheses remove ( only if the
     * "Remove Parentheses" option is enabled
     */
    function dagt_remove_parentheses(test_id){
        
        //verify if the "Remove Parentheses" option is enabled
        if( parseInt($('#dagt-remove-parentheses').val(), 10) == 1 ){
            
            //pass through all the sections of test
            $('#dagt-container-' + test_id + ' .dagt-section-container').each(function(){

               //pass through all the sentences
               $(this).children('.dagt-sentence-container').each(function(){

                  var sentence_html = $(this).html(); 

                  //remove the parentheses and their content from the sentence
                  sentence_html = sentence_html.replace(/\(.*?\)/gi, '');

                  //replace the updated html of the sentence
                  $(this).html(sentence_html);

               });

            });
            
        }
        
    }
    
    /*
     * Return true if the browser is any version of internet explorer, otherwise
     * return false
     * 
     * @return bool
     */
    function is_ie() {

        var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE ");

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))      // If Internet Explorer, return version number
            return true;
        else                 
            return false;

        return false;
     }
     
    /*
     * Return true if the browser is edge, otherwise return false
     * 
     * @return bool
     */
    function is_edge(){

        return !!navigator.userAgent.match(/Edge\/\d+/);

     }
     
     /*
      * Apply chosen only with non-mobile devices
      */
     function apply_chosen(){
         
        var isMobile = false;
        
        //verify the user agent
        if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
            || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) isMobile = true;
    
        if(!isMobile){
            $(".dagt-multiple-selection").chosen();
        }
    
     }
     
     /*
      * Returns true with windows phones, otherwise returns false
      */
     function is_windows_phone(){
         
        var is_windows_phone = false;
         
        if(navigator.userAgent.match(/Windows Phone/i)){
            //It's a windows phone
            is_windows_phone = true;
        }

        if(navigator.userAgent.match(/iemobile/i)){
            //It's some mobile IE browser
            is_windows_phone = true;
        }

        if(navigator.userAgent.match(/WPDesktop/i)){
            //It's a windows phone in desktop mode
            is_windows_phone = true;
        }
        
        return is_windows_phone;
         
     }

});